#!/usr/bin/env bash
# Transloadit. Copyright (c) 2017, Transloadit Ltd.
#
# Authors:
#
#  - Kevin van Zonneveld <kevin@transloadit.com>

set -o pipefail
set -o errexit
set -o nounset
# set -o xtrace

# Set magic variables for current FILE & DIR
__dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
__file="${__dir}/$(basename "${BASH_SOURCE[0]}")"
__base="$(basename ${__file} .sh)"

# brew update && brew upgrade asciinema && brew upgrade asciinema2gif
type asciinema || brew install asciinema
type asciinema2gif || brew install asciinema2gif

cat <<-EOF

  # preparation

  # demo script
  vim src/playground.js
  node src/playground.js silent 1
  node src/playground.js passthru
  node src/playground.js

EOF

asciinema rec -t "Scrolex - ${__base}"

echo ""
read -p "If you uploaded the demo, you should now make it public, and then type the ID here (e.g. 100025)" asciiID

asciinema2gif --theme monokai -o "${__dir}/${__base}.gif" "${asciiID}"
