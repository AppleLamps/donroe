$ErrorActionPreference = "Stop"

$Script = Join-Path $PSScriptRoot "build-articles.mjs"
node $Script $args
