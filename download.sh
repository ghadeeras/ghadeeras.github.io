#!sh

LIBRARY=$1
RELEASE=$2
[[ $LIBRARY == "" ]] && 
    echo "Missing required argument! Usage: ./download <library> [<release>]" && 
    exit 1
[[ $RELEASE == "" ]] && 
    RELEASE="latest"

LIBRARY_PATH="./dependencies/$LIBRARY"
RELEASE_PATH="$LIBRARY_PATH/$RELEASE"
RELEASE_URL="https://ghadeeras.github.io/$LIBRARY/$RELEASE"
echo
echo "Download request details:"
echo " - Library directory: $LIBRARY_PATH"
echo " - Release directory: $RELEASE_PATH"
echo " - Release URL: $RELEASE_URL"
echo

echo "Checking/setting up workspace ..."
mkdir "./dependencies" 2>/dev/null &&
    echo " - Created 'dependencies' directory."
mkdir "$LIBRARY_PATH" 2>/dev/null &&
    echo " - Created '$LIBRARY' directory."
rm -R "$RELEASE_PATH" 2>/dev/null
mkdir "$RELEASE_PATH" 2>/dev/null &&
    echo " - Created release '$RELEASE' directory."
echo "Workspace is ready."
echo

echo "Downloading $LIBRARY ..."
curl --location --fail "$RELEASE_URL/manifest" |
    grep -P "\\.[jt]s$" |
    xargs -I {} \
    curl --location --fail --output "$RELEASE_PATH/{}" "$RELEASE_URL/{}"
echo

echo "Downloaded files in '$RELEASE_PATH':"
ls "$RELEASE_PATH" |
    xargs -I {} \
    echo " - {}" 
