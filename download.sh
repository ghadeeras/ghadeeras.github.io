#!sh
rm ./dependencies/$1/latest/*
curl https://ghadeeras.github.io/$1/latest/manifest | xargs -I {} curl -o ./dependencies/$1/latest/{} https://ghadeeras.github.io/$1/latest/{}

