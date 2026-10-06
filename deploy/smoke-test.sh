#!/usr/bin/env sh
# Checks a deployed copy of the site from the outside: pages, clean URLs, redirects, the 404 page, caching,
# compression and security headers. Needs only curl.
#
#   sh deploy/smoke-test.sh https://aldenteai.com      # production (also checks www and http redirects)
#   sh deploy/smoke-test.sh http://localhost:8080      # the Docker image, before it goes live
#
# Exits 1 if any check fails.

BASE="${1:-https://aldenteai.com}"
BASE="${BASE%/}"
FAILED=0

pass() { printf '  ok    %s\n' "$1"; }
fail() { printf '  FAIL  %s\n' "$1"; FAILED=1; }

# status <path> → HTTP status code (no redirects followed)
status() { curl -s -o /dev/null -w '%{http_code}' "$BASE$1"; }
# location <path> → the Location header of a redirect
location() { curl -s -o /dev/null -w '%{redirect_url}' "$BASE$1"; }
# header <path> <name> → that response header's value
header() { curl -s -D - -o /dev/null "$BASE$1" | tr -d '\r' | grep -i "^$2:" | head -n 1 | cut -d' ' -f2-; }

expect_status() {
  got=$(status "$1")
  if [ "$got" = "$2" ]; then pass "$1 → $2"; else fail "$1 → expected $2, got $got"; fi
}

expect_redirect() {
  got_status=$(status "$1")
  got_location=$(location "$1")
  case "$got_location" in
    *"$2") ok_location=1 ;;
    *) ok_location=0 ;;
  esac
  if [ "$got_status" = "301" ] && [ "$ok_location" = "1" ]; then pass "$1 → 301 $2"; else fail "$1 → expected 301 to $2, got $got_status $got_location"; fi
}

expect_header() {
  got=$(header "$1" "$2")
  case "$got" in
    *"$3"*) pass "$1 has $2: $3" ;;
    *) fail "$1 header $2: expected to contain '$3', got '$got'" ;;
  esac
}

echo "Pages ($BASE)"
for path in / /aldo /order-verification /analytics /pricing /security /company /demo /cookies /privacy /terms \
  /solutions/operations /solutions/hr /solutions/delivery /robots.txt /sitemap-index.xml /og.jpg /favicon.svg; do
  expect_status "$path" 200
done

echo "One address per page"
expect_redirect /aldo.html /aldo
expect_redirect /aldo/ /aldo
expect_redirect /solutions/hr.html /solutions/hr
expect_redirect /index.html /
expect_redirect /about /company
expect_redirect /careers /company

echo "Missing pages"
expect_status /no-such-page 404
if curl -s "$BASE/no-such-page" | grep -q 'Aldo looked everywhere'; then pass "404 shows the site's own page"; else fail "404 does not show the site's own page"; fi

echo "Security headers"
for path in / /demo /no-such-page; do
  expect_header "$path" Content-Security-Policy "frame-src https://calendly.com"
done
expect_header / X-Content-Type-Options nosniff
expect_header / X-Frame-Options DENY
expect_header / Referrer-Policy strict-origin-when-cross-origin
expect_header / Permissions-Policy "camera=()"

echo "Caching and compression"
expect_header / Cache-Control no-cache
asset=$(curl -s "$BASE/" | grep -o '/_astro/[^"]*\.css' | head -n 1)
if [ -n "$asset" ]; then
  expect_header "$asset" Cache-Control immutable
  expect_header "$asset" Content-Security-Policy "default-src 'self'"
else
  fail "no /_astro/ stylesheet found on the home page"
fi
encoding=$(curl -s -H 'Accept-Encoding: gzip' -D - -o /dev/null "$BASE/" | tr -d '\r' | grep -i '^content-encoding:' | cut -d' ' -f2-)
case "$encoding" in
  gzip | br) pass "/ is compressed ($encoding)" ;;
  *) fail "/ is not compressed" ;;
esac

case "$BASE" in
  https://aldenteai.com)
    echo "Canonical host"
    got=$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' "https://www.aldenteai.com/aldo")
    [ "$got" = "301 https://aldenteai.com/aldo" ] && pass "www → bare domain" || fail "www → bare domain: got $got"
    got=$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' "http://aldenteai.com/aldo")
    [ "$got" = "301 https://aldenteai.com/aldo" ] && pass "http → https" || fail "http → https: got $got"
    ;;
esac

if [ "$FAILED" = "0" ]; then echo "All checks passed."; else echo "Some checks failed." && exit 1; fi
