#!/bin/bash
# 国土数値情報の地価公示（L01）・都道府県地価調査（L02）の最新年を取ってきて、市区町村ごとの地点データにする
set -eu
T=$(mktemp -d)
get(){ local kind=$1; local yy=$(( $(date +%Y) % 100 + 1 )); for i in 0 1 2 3; do local y=$(printf "%02d" $((yy-i)));
  local u="https://nlftp.mlit.go.jp/ksj/gml/data/${kind}/${kind}-${y}/${kind}-${y}_GML.zip";
  if curl -sf -o "$T/${kind}.zip" "$u"; then echo "$u" >&2; unzip -o -q "$T/${kind}.zip" -d "$T/${kind}"; find "$T/${kind}" -name "*.geojson" | head -1; return; fi; done; echo "取得できませんでした：${kind}" >&2; exit 1; }
A=$(get L01); B=$(get L02)
node scripts/chika.js "$A" "$B"
