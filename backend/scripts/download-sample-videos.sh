#!/bin/bash

# Diretório de destino para os arquivos de vídeo
VIDEO_DIR="../videos"

# Cria o diretório se não existir
mkdir -p "$VIDEO_DIR"

echo "Baixando arquivos de amostra para testes..."

# Baixa um arquivo MP4 pequeno (Big Buck Bunny)
echo "Baixando amostra MP4..."
curl -o "$VIDEO_DIR/sample-mp4.mp4" "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4"

# Baixa um arquivo MKV pequeno para teste
echo "Baixando amostra MKV pequena..."
curl -o "$VIDEO_DIR/sample-mkv-small.mkv" "https://test-videos.co.uk/vids/jellyfish/mkv/h264/720/Jellyfish_720_10s_1MB.mkv"

# Baixa um arquivo MKV de tamanho médio - Sintel trailer (aprox. 25MB)
echo "Baixando amostra MKV média (Sintel trailer)..."
curl -o "$VIDEO_DIR/sintel-trailer-mkv.mkv" "https://test-videos.co.uk/vids/sintel/mkv/h264/1080/Sintel_1080_10s_3MB.mkv"

# Baixa um arquivo MKV para simular arquivo grande (com nome indicando 4K)
echo "Baixando amostra MKV para simular arquivo grande..."
curl -o "$VIDEO_DIR/large-4k-movie-1080p.mkv" "https://test-videos.co.uk/vids/sintel/mkv/h264/720/Sintel_720p_5s.mkv"

# Chama um script para baixar um arquivo MKV maior (se disponível)
echo "Verificando se já existe arquivo MKV grande para testes..."
if [ -f "$VIDEO_DIR/Christmas.Vacation.1989.REMASTERED.1080p.BluRay.X264-AMIABLE.DUAL-Lannister.mkv" ]; then
    echo "Arquivo MKV grande já existe: Christmas.Vacation.1989..."
    ls -lh "$VIDEO_DIR/Christmas.Vacation.1989.REMASTERED.1080p.BluRay.X264-AMIABLE.DUAL-Lannister.mkv"
else
    echo "NOTA: Para testar com arquivos realmente grandes, recomendamos:"
    echo "1. Baixar um vídeo MKV grande (>1GB) de uma fonte legal"
    echo "2. Renomear para incluir '1080p', '4K' ou '2160p' no nome"
    echo "3. Colocá-lo na pasta 'videos'"
fi

# Informações sobre como testar
echo -e "\nLinks para baixar amostras maiores (use se necessário):"
echo "1. Tears of Steel (MKV, 2GB+): https://download.blender.org/demo/movies/ToS/tears_of_steel_1080p.mkv"
echo "2. Big Buck Bunny (4K MKV ~307MB): magnet:?xt=urn:btih:64b0c9e6c7e318a089a0e6359e46bb3af44cead0"

echo -e "\nArquivos de amostra baixados para: $VIDEO_DIR"
echo "Para importar estes arquivos para o banco de dados:"
echo "1. Inicie o servidor (se não estiver rodando): cd .. && npm run start:dev"
echo "2. Acesse a aplicação web e clique em 'Importar do Diretório'"
echo "3. Teste especialmente o arquivo: large-4k-movie-1080p.mkv" 