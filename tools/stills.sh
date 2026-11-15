#!/bin/bash
# Images de contrôle: tools/stills.sh TAG FRAME [FRAME...]
tag=$1; shift; mkdir -p stills
CH=$(command -v google-chrome || command -v chromium || command -v chromium-browser)
for f in "$@"; do
  npx remotion still src/index.jsx Story stills/${tag}_$(printf %04d $f).png --frame=$f --scale=0.5 --gl=swangle ${CH:+--browser-executable=$CH} 2>&1 | grep -iE "error|fail|cannot" | head -3
done
