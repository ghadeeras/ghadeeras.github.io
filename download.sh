#!sh

LIBRARY=$1
LANG=$2
[[ $LIBRARY == "" ]] && 
    echo "Missing required argument! Usage: ./download <library> [<lang=js>]" && 
    exit 1
[[ $LANG == "" ]] && 
    LANG="js"

LIBRARY_PATH="./dependencies/$LIBRARY"
LANG_PATH="$LIBRARY_PATH/$LANG"
LANG_URL="https://ghadeeras.github.io/$LIBRARY/$LANG"
echo
echo "Download request details:"
echo " - Library directory: $LIBRARY_PATH"
echo " - LANG directory: $LANG_PATH"
echo " - LANG URL: $LANG_URL"
echo

echo "Checking/setting up workspace ..."
mkdir "./dependencies" 2>/dev/null &&
    echo " - Created 'dependencies' directory."
mkdir "$LIBRARY_PATH" 2>/dev/null &&
    echo " - Created '$LIBRARY' directory."
rm -R "$LANG_PATH" 2>/dev/null
mkdir "$LANG_PATH" 2>/dev/null &&
    echo " - Created lang '$LANG' directory."
echo "Workspace is ready."
echo

echo "Downloading $LIBRARY ..."
curl --no-buffer --location --fail "$LANG_URL/manifest" |
    grep -E "\\.[jt]s$" |
    xargs -I {} \
    curl --location --fail --output "$LANG_PATH/{}" "$LANG_URL/{}"
echo

echo "Downloaded files in '$LANG_PATH':"
ls "$LANG_PATH" |
    xargs -I {} \
    echo " - {}" 
