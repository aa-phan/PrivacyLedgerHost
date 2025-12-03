#!/bin/bash
# Get the directory where this script is located
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "------------------------------------------------"
echo "   Privacy Ledger: Setup & Permission Fix"
echo "------------------------------------------------"
echo "1. Removing Quarantine Attributes..."
xattr -cr "$DIR"

echo "2. Re-signing Application (Ad-Hoc)..."
# forces a new local signature on the entire folder
codesign --force --deep --sign - "$DIR"

echo "Success! Permissions fixed."
echo "Launching Privacy Ledger Host..."
echo "------------------------------------------------"

# Launch executable
"$DIR/PrivacyLedgerHost"
