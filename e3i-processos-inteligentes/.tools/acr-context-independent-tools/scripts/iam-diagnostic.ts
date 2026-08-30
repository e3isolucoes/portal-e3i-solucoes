import { GoogleAuth } from 'google-auth-library';
import { Firestore } from '@google-cloud/firestore';
import { BigQuery } from '@google-cloud/bigquery';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

async function runIAMDiagnostic() {
  console.log("=== E3I IAM & GCP Connectivity Diagnostic ===");

  const report: Record<string, any> = {
    timestamp: new Date().toISOString(),
    auth: {},
    projects: {},
    firestore: {},
    bigquery: {},
    status: 'COMPLETED'
  };

  let principal = 'Desconhecido';
  let clientType = 'Desconhecido';
  let adcProject = 'Não detectado';
  let quotaProject = 'Não detectado';

  try {
    const auth = new GoogleAuth({
      scopes: [
        'https://www.googleapis.com/auth/cloud-platform',
        'https://www.googleapis.com/auth/datastore',
        'https://www.googleapis.com/auth/bigquery'
      ]
    });
    
    const client = await auth.getClient();
    clientType = client.constructor.name;

    if (typeof (client as any).getProjectId === 'function') {
      try {
        adcProject = await (client as any).getProjectId();
      } catch (e: any) {
        report.auth.adcProjectError = e.message;
      }
    }

    if (typeof (client as any).getCredentials === 'function') {
      try {
        const creds = await (client as any).getCredentials();
        if (creds && creds.client_email) {
          principal = creds.client_email;
        }
      } catch (e: any) {
        report.auth.credentialsError = e.message;
      }
    }

    if ((auth as any).quotaProjectId) {
      quotaProject = (auth as any).quotaProjectId;
    } else if (process.env.GOOGLE_CLOUD_QUOTA_PROJECT) {
      quotaProject = process.env.GOOGLE_CLOUD_QUOTA_PROJECT;
    }
  } catch (err: any) {
    report.auth.error = err.message;
  }

  const resourceProject = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID || 'NÃO CONFIGURADO';

  report.auth = {
    ...report.auth,
    principal,
    clientType,
    googleApplicationCredentialsConfigured: !!process.env.GOOGLE_APPLICATION_CREDENTIALS
  };

  report.projects = {
    resourceProject,
    adcProject,
    quotaProject,
    errorProject: '453000302319'
  };

  console.log(`Principal: ${principal}`);
  console.log(`Tipo de Cliente ADC: ${clientType}`);
  console.log(`Resource Project: ${resourceProject}`);
  console.log(`ADC Project: ${adcProject}`);
  console.log(`Quota Project: ${quotaProject}`);

  // Test Firestore
  console.log(`\n[Firestore] Testando acesso...`);
  const firestoreDatabaseId = process.env.FIRESTORE_DATABASE || '(default)';
  try {
    const firestore = new Firestore({
      projectId: resourceProject !== 'NÃO CONFIGURADO' ? resourceProject : undefined,
      databaseId: firestoreDatabaseId
    });
    report.firestore.clientInitialized = true;
    report.firestore.projectId = (firestore as any).projectId;
    report.firestore.databaseId = firestoreDatabaseId;

    // Try a metadata or list collection test
    try {
      const collections = await firestore.listCollections();
      report.firestore.listCollections = 'SUCESSO';
      report.firestore.collectionCount = collections.length;
    } catch (fsErr: any) {
      report.firestore.listCollections = 'FALHA';
      report.firestore.error = fsErr.message;
      console.log(`[Firestore Error] ${fsErr.message}`);
    }
  } catch (err: any) {
    report.firestore.clientInitialized = false;
    report.firestore.error = err.message;
    console.log(`[Firestore Init Error] ${err.message}`);
  }

  // Test BigQuery
  console.log(`\n[BigQuery] Testando acesso...`);
  const bqDataset = process.env.BIGQUERY_DATASET || '_e3i_analytics';
  const bqLocation = process.env.BIGQUERY_LOCATION || 'US';
  try {
    const bigquery = new BigQuery({
      projectId: resourceProject !== 'NÃO CONFIGURADO' ? resourceProject : undefined,
      location: bqLocation
    });
    report.bigquery.clientInitialized = true;
    report.bigquery.projectId = bigquery.projectId;
    report.bigquery.dataset = bqDataset;

    try {
      const dataset = bigquery.dataset(bqDataset);
      const [exists] = await dataset.exists();
      report.bigquery.datasetExists = exists;
      console.log(`[BigQuery] Dataset ${bqDataset} existe: ${exists}`);
    } catch (bqErr: any) {
      report.bigquery.datasetExists = false;
      report.bigquery.error = bqErr.message;
      console.log(`[BigQuery Error] ${bqErr.message}`);
    }
  } catch (err: any) {
    report.bigquery.clientInitialized = false;
    report.bigquery.error = err.message;
    console.log(`[BigQuery Init Error] ${err.message}`);
  }

  // Save report markdown
  const mdContent = `# E³I — Relatório de Diagnóstico IAM & GCP

**Data/Hora:** ${report.timestamp}

## Identidade e Autenticação (ADC)
- **Principal:** ${report.auth.principal}
- **Tipo de Cliente:** ${report.auth.clientType}
- **GOOGLE_APPLICATION_CREDENTIALS:** ${report.auth.googleApplicationCredentialsConfigured ? 'SIM' : 'NÃO'}

## Projetos Detectados
- **Resource Project:** ${report.projects.resourceProject}
- **ADC Project:** ${report.projects.adcProject}
- **Quota Project:** ${report.projects.quotaProject}
- **Error Project Relacionado:** ${report.projects.errorProject}

## Firestore
- **Cliente Inicializado:** ${report.firestore.clientInitialized ? 'SIM' : 'NÃO'}
- **Project ID Efetivo:** ${report.firestore.projectId || 'N/A'}
- **Database ID:** ${report.firestore.databaseId || 'N/A'}
- **Acesso a Coleções (Listagem):** ${report.firestore.listCollections || 'N/A'}
- **Erro / Detalhes:** \`${report.firestore.error || 'Nenhum'}\`

## BigQuery
- **Cliente Inicializado:** ${report.bigquery.clientInitialized ? 'SIM' : 'NÃO'}
- **Project ID Efetivo:** ${report.bigquery.projectId || 'N/A'}
- **Dataset Alvo:** ${report.bigquery.dataset || 'N/A'}
- **Verificação de Dataset:** ${report.bigquery.datasetExists !== undefined ? String(report.bigquery.datasetExists) : 'N/A'}
- **Erro / Detalhes:** \`${report.bigquery.error || 'Nenhum'}\`
`;

  const reportDir = path.join(process.cwd(), 'docs', 'test-results');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  fs.writeFileSync(path.join(reportDir, 'iam-diagnostic-report.md'), mdContent, 'utf-8');
  console.log(`\nRelatório salvo em /docs/test-results/iam-diagnostic-report.md`);
}

runIAMDiagnostic().catch(console.error);
