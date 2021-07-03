#!/usr/bin/bash

LIBRARY=$1
[[ $LIBRARY == "" ]] && 
    echo "Missing required argument! Usage: ./download <library>" && 
    exit 1

LIBRARY_PATH="./dependencies/$LIBRARY"
LIBRARY_URL="https://ghadeeras.github.io/$LIBRARY"
echo
echo "Download request details:"
echo " - Library directory: $LIBRARY_PATH"
echo " - Library URL: $LIBRARY_URL"
echo

echo "Checking/setting up workspace ..."
mkdir "./dependencies" 2>/dev/null &&
    echo " - Created 'dependencies' directory."
rm -R "$LIBRARY_PATH" 2>/dev/null
mkdir "$LIBRARY_PATH" 2>/dev/null &&
    echo " - Created library '$LIBRARY' directory."
echo "Workspace is ready."
echo

echo "Downloading $LIBRARY ..."
curl --no-buffer --location --fail "$LIBRARY_URL/manifest" |
    xargs -I {} \
    curl --location --fail --create-dirs --output "$LIBRARY_PATH/{}" "$LIBRARY_URL/{}"
echo

echo "Downloaded files in '$LIBRARY_PATH':"
find "$LIBRARY_PATH" -type f |
    xargs -I {} \
    echo " - {}" 
