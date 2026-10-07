#!/usr/bin/env bash
# Stop whatever local preview server listens on the given port (default 4173).
port="${1:-4173}"
hex=$(printf '%04X' "$port")
inodes=$(awk -v h=":$hex" '$2 ~ h"$" && $4=="0A" {print $10}' /proc/net/tcp /proc/net/tcp6 2>/dev/null)
for inode in $inodes; do
  for fd in /proc/[0-9]*/fd/*; do
    if [ "$(readlink "$fd" 2>/dev/null)" = "socket:[$inode]" ]; then
      pid=$(echo "$fd" | cut -d/ -f3); kill "$pid" 2>/dev/null && echo "stopped pid $pid on port $port"
    fi
  done
done
