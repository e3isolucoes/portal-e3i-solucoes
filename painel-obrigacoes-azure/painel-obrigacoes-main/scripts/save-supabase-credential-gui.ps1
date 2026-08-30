param(
    [string]$OutputPath = (Join-Path $PSScriptRoot '..\.secrets\supabase-db-password.dpapi'),
    [string]$WindowTitle = 'Credencial segura do Supabase',
    [string]$Prompt = 'Cole a nova senha do banco Supabase:'
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$form = New-Object System.Windows.Forms.Form
$form.Text = $WindowTitle
$form.StartPosition = 'CenterScreen'
$form.ClientSize = New-Object System.Drawing.Size(460, 160)
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false
$form.MinimizeBox = $false

$label = New-Object System.Windows.Forms.Label
$label.Text = $Prompt
$label.AutoSize = $true
$label.Location = New-Object System.Drawing.Point(20, 20)
$form.Controls.Add($label)

$passwordBox = New-Object System.Windows.Forms.TextBox
$passwordBox.Location = New-Object System.Drawing.Point(20, 48)
$passwordBox.Size = New-Object System.Drawing.Size(420, 28)
$passwordBox.UseSystemPasswordChar = $true
$form.Controls.Add($passwordBox)

$saveButton = New-Object System.Windows.Forms.Button
$saveButton.Text = 'Salvar com proteção do Windows'
$saveButton.Location = New-Object System.Drawing.Point(210, 98)
$saveButton.Size = New-Object System.Drawing.Size(230, 34)
$saveButton.DialogResult = [System.Windows.Forms.DialogResult]::OK
$form.AcceptButton = $saveButton
$form.Controls.Add($saveButton)

$cancelButton = New-Object System.Windows.Forms.Button
$cancelButton.Text = 'Cancelar'
$cancelButton.Location = New-Object System.Drawing.Point(100, 98)
$cancelButton.Size = New-Object System.Drawing.Size(100, 34)
$cancelButton.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
$form.CancelButton = $cancelButton
$form.Controls.Add($cancelButton)

$form.Add_Shown({ $passwordBox.Focus() })
$result = $form.ShowDialog()

if ($result -ne [System.Windows.Forms.DialogResult]::OK -or [string]::IsNullOrWhiteSpace($passwordBox.Text)) {
    exit 2
}

$resolvedOutput = [System.IO.Path]::GetFullPath($OutputPath)
$secretDirectory = Split-Path -Parent $resolvedOutput
New-Item -ItemType Directory -Path $secretDirectory -Force | Out-Null

$secureValue = ConvertTo-SecureString -String $passwordBox.Text -AsPlainText -Force
$encrypted = ConvertFrom-SecureString -SecureString $secureValue
[System.IO.File]::WriteAllText($resolvedOutput, $encrypted, [System.Text.UTF8Encoding]::new($false))

[System.Windows.Forms.MessageBox]::Show(
    'Senha armazenada com proteção DPAPI para o usuário atual do Windows.',
    'Concluído',
    [System.Windows.Forms.MessageBoxButtons]::OK,
    [System.Windows.Forms.MessageBoxIcon]::Information
) | Out-Null
