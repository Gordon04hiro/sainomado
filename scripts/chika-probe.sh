#!/bin/bash
# 地価公示（L01）・地価調査（L02）の国土数値情報を取ってきて、中身の形を確かめる（試し用）
set -u
mkdir -p /tmp/ck && cd /tmp/ck
for kind in L01 L02; do
  for yy in 26 25 24; do
    u="https://nlftp.mlit.go.jp/ksj/gml/data/${kind}/${kind}-${yy}/${kind}-${yy}_GML.zip"
    code=$(curl -s -o ${kind}.zip -w "%{http_code}" "$u")
    echo "$u -> $code $(stat -c %s ${kind}.zip 2>/dev/null)"
    if [ "$code" = "200" ]; then break; fi
  done
  unzip -o -q ${kind}.zip -d ${kind} || true
  find ${kind} -type f | head -20
  g=$(find ${kind} -name "*.geojson" | head -1)
  if [ -n "$g" ]; then node -e "const j=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));console.log('features',j.features.length);const p=j.features[0].properties;console.log(JSON.stringify(p).slice(0,3000));console.log(JSON.stringify(j.features[0].geometry))" "$g"; fi
done
