#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
: "${FENG_RELEASE_VERSION:?Register the release before building}"
: "${PORTAL_IMAGE_TAG:=$FENG_RELEASE_VERSION}"
if [[ ${PORTAL_SKIP_BUILD:-0} != 1 ]]; then
  bundle lock --local
  bundle exec jekyll build --destination target/site
  node scripts/configure-portal.mjs
fi
[[ -f target/site/index.html && -f target/site/en/shop/index.html ]] || { echo 'Portal pages missing' >&2; exit 2; }
[[ ${PORTAL_BUILD_ONLY:-0} != 1 ]] || exit 0
docker build -t "feng-cloud/feng-portal:$PORTAL_IMAGE_TAG" .
if [[ ${PORTAL_IMPORT_TO_CTR:-0} == 1 ]]; then
  docker save "feng-cloud/feng-portal:$PORTAL_IMAGE_TAG" | ctr -n k8s.io images import -
fi
