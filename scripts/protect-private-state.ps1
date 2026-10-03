# Application-owned helper. Restrict a newly created private state root; no policy bypass.
param([Parameter(Mandatory=$true)][string]$StatePath)
$ErrorActionPreference = 'Stop'
$item = Get-Item -LiteralPath $StatePath -Force
if (-not $item.PSIsContainer -or ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Invalid state directory' }
$sid = [Security.Principal.WindowsIdentity]::GetCurrent().User
$existing = Get-Acl -LiteralPath $StatePath
if ($existing.GetOwner([Security.Principal.SecurityIdentifier]).Value -ne $sid.Value) { throw 'State directory owner differs' }
function Test-PrivateAcl($candidate) {
    if (-not $candidate.AreAccessRulesProtected) { return $false }
    $rules = @($candidate.GetAccessRules($true, $true, [Security.Principal.SecurityIdentifier]))
    if ($rules.Count -ne 2) { return $false }
    $identities = @()
    foreach ($rule in $rules) {
        $identity = $rule.IdentityReference.Value
        if ($identity -notin @($sid.Value, 'S-1-5-18') -or $rule.AccessControlType -ne 'Allow' -or
            $rule.FileSystemRights -ne [Security.AccessControl.FileSystemRights]::FullControl -or
            $rule.InheritanceFlags -ne [Security.AccessControl.InheritanceFlags]'ContainerInherit,ObjectInherit') { return $false }
        $identities += $identity
    }
    return ($identities -contains $sid.Value -and $identities -contains 'S-1-5-18')
}
# Normal restarts verify the existing DACL without rewriting security metadata.
if (Test-PrivateAcl $existing) { exit 0 }
# Construct only a discretionary ACL. Reapplying a full Get-Acl object can request
# audit/security privileges unnecessarily; do not touch audit rules or ownership.
$acl = [Security.AccessControl.DirectorySecurity]::new()
$acl.SetAccessRuleProtection($true, $false)
$inherit = [Security.AccessControl.InheritanceFlags]'ContainerInherit,ObjectInherit'
$propagate = [Security.AccessControl.PropagationFlags]::None
foreach ($identity in @($sid, [Security.Principal.SecurityIdentifier]::new('S-1-5-18'))) {
    $rule = [Security.AccessControl.FileSystemAccessRule]::new($identity, 'FullControl', $inherit, $propagate, 'Allow')
    $acl.AddAccessRule($rule)
}
try { Set-Acl -LiteralPath $StatePath -AclObject $acl }
catch { if (-not (Test-PrivateAcl (Get-Acl -LiteralPath $StatePath))) { throw } }
if (-not (Test-PrivateAcl (Get-Acl -LiteralPath $StatePath))) { throw 'Private access rules could not be verified' }
