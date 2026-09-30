#!/bin/bash
# usage: dl-cards.sh <list.txt>   lines: <member> <expr> <hf_basename>
B=https://d8j0ntlcm91z4.cloudfront.net/user_3AvdTV4QzMGevLsVk5Y1D7eAOpH
cd "$(dirname "$0")/.."
while read -r m e f; do
  [ -z "$m" ] && continue
  out="assets/generated/expr/${m}_${e}.png"
  [ -s "$out" ] && continue
  curl -sL --retry 3 -o "$out" "$B/$f.png" && echo "ok $m $e $(stat -f%z "$out")"
done < "$1"
