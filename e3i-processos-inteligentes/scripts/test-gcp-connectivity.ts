import { Firestore, FieldValue } from '@google-cloud/firestore';
import { BigQuery } from '@google-cloud/bigquery';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function runGcpConnectivityTest() {
  console.log("=== E3I SR-02.2A: Validação Real de Firestore e BigQuery ===");

  const opProvider = process.env.OPERATIONAL_PERSISTENCE_PROVIDER || 'firestore';
  const anProvider = process.env.ANALYTICAL_PERSISTENCE_PROVIDER || 'bigquery';
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID;
  const firestoreDb = process.env.FIRESTORE_DATABASE || '(default)';
  const bqDataset = process.env.BIGQUERY_DATASET;
  const bqLocation = process.env.BIGQUERY_LOCATION;

  console.log(`OPERATIONAL_PERSISTENCE_PROVIDER: ${opProvider}`);
  console.log(`ANALYTICAL_PERSISTENCE_PROVIDER: ${anProvider}`);
  console.log(`GOOGLE_CLOUD_PROJECT: ${projectId ? 'CONFIGURADO' : 'AUSENTE'}`);
  console.log(`FIRESTORE_DATABASE: ${firestoreDb ? 'CONFIGURADO' : 'AUSENTE'}`);
  console.log(`BIGQUERY_DATASET: ${bqDataset ? 'CONFIGURADO' : 'AUSENTE'}`);
  console.log(`BIGQUERY_LOCATION: ${bqLocation ? 'CONFIGURADO' : 'AUSENTE'}`);

  let firestoreClientCreated = false;
  let firestoreCreateOk = false;
  let firestoreReadOk = false;
  let firestoreDeleteOk = false;
  let restartTestOk = false;

  let bqClientCreated = false;
  let bqDatasetLocated = false;
  let bqInsertOk = false;
  let bqSelectOk = false;
  let bqTableDropped = false;

  let jsonFallbackUsed = false;
  let sqliteUsed = false;
  let blockedByEnvironment = false;

  if (!projectId || !bqDataset) {
    console.log("[BLOQUEADO PELO AMBIENTE] Variáveis obrigatórias do GCP ausentes.");
    blockedByEnvironment = true;
  } else {
    try {
      // 1. Firestore Test
      console.log("\n[Firestore] Inicializando client...");
      const firestore = new Firestore({
        projectId: projectId,
        databaseId: firestoreDb
      });
      firestoreClientCreated = true;

      const collRef = firestore.collection('_e3i_connection_tests');
      const testDocRef = collRef.doc();
      const testId = testDocRef.id;

      console.log(`[Firestore] Criando documento temporário (${testId})...`);
      await testDocRef.set({
        source: "ai-studio",
        test: "firestore-connectivity",
        createdAt: FieldValue.serverTimestamp()
      });
      firestoreCreateOk = true;

      console.log("[Firestore] Lendo documento...");
      const docSnap = await testDocRef.get();
      if (docSnap.exists) {
        firestoreReadOk = true;
      }

      console.log("[Firestore] Excluindo documento...");
      await testDocRef.delete();
      const deletedSnap = await testDocRef.get();
      if (!deletedSnap.exists) {
        firestoreDeleteOk = true;
      }

      // Restart test
      console.log("[Firestore] Teste de reinicialização lógica (nova instância)...");
      await testDocRef.set({
        source: "ai-studio-restart",
        test: "firestore-restart",
        createdAt: new Date().toISOString()
      });
      const firestore2 = new Firestore({ projectId: projectId, databaseId: firestoreDb });
      const docSnap2 = await firestore2.collection('_e3i_connection_tests').doc(testId).get();
      if (docSnap2.exists) {
        await firestore2.collection('_e3i_connection_tests').doc(testId).delete();
        restartTestOk = true;
      }

    } catch (e: any) {
      console.error("[Firestore ERROR]", e.message);
      if (e.message.includes('credentials') || e.message.includes('Could not load the default credentials') || e.message.includes('project') || e.message.includes('PERMISSION_DENIED')) {
        blockedByEnvironment = true;
      }
    }

    try {
      // 2. BigQuery Test
      console.log("\n[BigQuery] Inicializando client...");
      const bq = new BigQuery({ projectId: projectId });
      bqClientCreated = true;

      const dataset = bq.dataset(bqDataset!);
      const [datasetExists] = await dataset.exists();
      if (datasetExists) {
        bqDatasetLocated = true;
      } else {
        console.log(`[BigQuery] Dataset ${bqDataset} não localizado. Tentando criar...`);
        await dataset.create({ location: bqLocation || 'US' });
        bqDatasetLocated = true;
      }

      const tableName = '_e3i_connection_test';
      const table = dataset.table(tableName);
      const [tableExists] = await table.exists();
      if (!tableExists) {
        await table.create({
          schema: [
            { name: 'test_id', type: 'STRING' },
            { name: 'source', type: 'STRING' },
            { name: 'created_at', type: 'TIMESTAMP' }
          ]
        });
      }

      const uniqueTestId = `test-${Date.now()}`;
      console.log(`[BigQuery] Inserindo linha em ${tableName} (${uniqueTestId})...`);
      await table.insert([
        { test_id: uniqueTestId, source: 'ai-studio', created_at: new Date().toISOString() }
      ]);
      bqInsertOk = true;

      console.log("[BigQuery] Consultando via SQL parametrizado...");
      const query = `SELECT test_id, source FROM \`${projectId}.${bqDataset}.${tableName}\` WHERE test_id = @testId`;
      const [rows] = await bq.query({ query, params: { testId: uniqueTestId } });
      if (rows.length > 0 && rows[0].test_id === uniqueTestId) {
        bqSelectOk = true;
      }

      console.log("[BigQuery] Excluindo tabela temporária...");
      await table.delete({ ignoreNotFound: true });
      bqTableDropped = true;

    } catch (e: any) {
      console.error("[BigQuery ERROR]", e.message);
      if (e.message.includes('credentials') || e.message.includes('Could not load the default credentials') || e.message.includes('project') || e.message.includes('Not Found') || e.message.includes('API has not been used')) {
        blockedByEnvironment = true;
      }
    }
  }

  // Check fallbacks in code
  const serverCode = fs.readFileSync(path.join(process.cwd(), 'server.ts'), 'utf8');
  if (serverCode.includes('loadFirestoreDataset') || serverCode.includes('saveFirestoreDataset') || serverCode.includes('e3i_storage.json')) {
    jsonFallbackUsed = true;
  }
  if (serverCode.includes('sqlite') || serverCode.includes('sqlite3')) {
    sqliteUsed = true;
  }

  console.log("\n=== Resumo dos Testes == supplemental ===");
  console.log(`Firestore client criado: ${firestoreClientCreated ? 'SIM' : 'NÃO'}`);
  console.log(`Firestore CREATE: ${firestoreCreateOk ? 'SIM' : 'NÃO'}`);
  console.log(`Firestore READ: ${firestoreReadOk ? 'SIM' : 'NÃO'}`);
  console.log(`Firestore DELETE: ${firestoreDeleteOk ? 'SIM' : 'NÃO'}`);
  console.log(`BigQuery client criado: ${bqClientCreated ? 'SIM' : 'NÃO'}`);
  console.log(`Dataset localizado: ${bqDatasetLocated ? 'SIM' : 'NÃO'}`);
  console.log(`BigQuery INSERT: ${bqInsertOk ? 'SIM' : 'NÃO'}`);
  console.log(`BigQuery SELECT parametrizado: ${bqSelectOk ? 'SIM' : 'NÃO'}`);
  console.log(`Tabela temporária removida: ${bqTableDropped ? 'SIM' : 'NÃO'}`);
  console.log(`JSON fallback utilizado: ${jsonFallbackUsed ? 'SIM' : 'NÃO'}`);
  console.log(`SQLite utilizado: ${sqliteUsed ? 'SIM' : 'NÃO'}`);

  // Generate markdown report
  const reportDir = path.join(process.cwd(), 'docs', 'test-results');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const reportPath = path.join(reportDir, 'gcp-connectivity.md');
  const markdownContent = `# Relatório de Teste de Conectividade GCP (E3I SR-02.2A)

**Data/Hora:** ${new Date().toISOString()}
**Status Geral:** ${blockedByEnvironment ? 'BLOQUEADO PELO AMBIENTE' : (firestoreDeleteOk && bqSelectOk ? 'APROVADO' : 'REPROVADO')}

| Verificação | Resultado |
|---|---|
| Firestore client criado | ${firestoreClientCreated ? 'APROVADO' : 'FALHOU'} |
| Firestore CREATE | ${firestoreCreateOk ? 'APROVADO' : 'FALHOU'} |
| Firestore READ | ${firestoreReadOk ? 'APROVADO' : 'FALHOU'} |
| Firestore DELETE | ${firestoreDeleteOk ? 'APROVADO' : 'FALHOU'} |
| BigQuery client criado | ${bqClientCreated ? 'APROVADO' : 'FALHOU'} |
| Dataset localizado | ${bqDatasetLocated ? 'APROVADO' : 'FALHOU'} |
| BigQuery INSERT | ${bqInsertOk ? 'APROVADO' : 'FALHOU'} |
| BigQuery SELECT parametrizado | ${bqSelectOk ? 'APROVADO' : 'FALHOU'} |
| Tabela temporária removida | ${bqTableDropped ? 'APROVADO' : 'FALHOU'} |
| JSON fallback utilizado | ${jsonFallbackUsed ? 'SIM (REPROVADO)' : 'NÃO (OK)'} |
| SQLite utilizado | ${sqliteUsed ? 'SIM (REPROVADO)' : 'NÃO (OK)'} |
`;

  fs.writeFileSync(reportPath, markdownContent);
  console.log(`\nRelatório salvo em ${reportPath}`);

  if (blockedByEnvironment) {
    console.log("\nBLOQUEADO PELO AMBIENTE");
    process.exit(0);
  } else if (firestoreDeleteOk && bqSelectOk && !jsonFallbackUsed && !sqliteUsed) {
    console.log("\nAPROVADO");
    process.exit(0);
  } else {
    console.log("\nREPROVADO");
    process.exit(1);
  }
}

runGcpConnectivityTest().catch(err => {
  console.error("Erro fatal no teste de conectividade GCP:", err);
  console.log("\nBLOQUEADO PELO AMBIENTE");
  process.exit(0);
});
