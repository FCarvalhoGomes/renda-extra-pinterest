# Automação gratuita para Pinterest

Este projeto cria seis imagens verticais e o arquivo `pinterest-upload.csv` aceito pela importação em lote do Pinterest Business.

## Preparação única

1. Entre no GitHub e crie um repositório público chamado `renda-extra-pinterest`.
2. Abra `config.json` e substitua `SEU_USUARIO_GITHUB` pelo seu usuário.
3. Coloque as fotos na pasta `fotos` usando exatamente os nomes indicados no arquivo `fotos/LEIA-ME.txt`.

## Gerar

Clique duas vezes em `gerar-pins.bat`.

O programa cria:

- seis artes em `pins`;
- `pinterest-upload.csv` com título, descrição, pasta, link afiliado, palavras-chave e URL pública da imagem.

Depois envie esta pasta ao GitHub. No Pinterest Business, acesse `Configurações > Importar conteúdo` e envie `pinterest-upload.csv`.

## Alterar textos ou produtos

Edite `dados-pinterest.json`. Cada item gera uma imagem e uma linha no CSV.

As imagens devem permanecer no repositório público para que o Pinterest consiga acessá-las.
