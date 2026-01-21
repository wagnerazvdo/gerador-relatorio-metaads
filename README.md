# 🚀 Gerador de Relatórios Meta Ads com IA (Gemini)

[🔗 Acesse o App aqui](https://gerador-relatorio-metaads.vercel.app/).

Este é um Web App moderno construído com **Next.js 15**, **Tailwind CSS** e a **API do Google Gemini**, projetado para transformar exportações de dados brutas do Meta Ads (CSV) em relatórios de desempenho formatados e prontos para envio via WhatsApp.

## ✨ Funcionalidades

-   📅 **Filtro por Data:** Processa apenas os dados da data selecionada.
-   📊 **Análise de Gastos:** Filtra automaticamente campanhas que tiveram investimento (valor > 0).
-   🤖 **Inteligência Artificial:** Utiliza o modelo Gemini 3 Flash para analisar métricas e gerar insights (Efetividade e Recomendações).
-   🇧🇷 **Formatação Brasileira:** Converte automaticamente moedas (R$ com vírgula) e datas (DD/MM/YYYY).
-   📋 **Copy-to-Clipboard:** Botão para copiar o relatório completo com um clique.
-   📱 **Interface Responsiva:** Otimizado para uso em Desktop e Mobile.

## 🛠️ Tecnologias Utilizadas

-   [Next.js](https://nextjs.org/) - Framework React para produção.
-   [Tailwind CSS](https://tailwindcss.com/) - Estilização moderna e responsiva.
-   [PapaParse](https://www.papaparse.com/) - Parser robusto para arquivos CSV.
-   [Google Gemini API](https://ai.google.dev/) - Inteligência Artificial para análise e redação.

## 🚀 Como Executar o Projeto

### Pré-requisitos
-   Node.js instalado.
-   Uma chave de API do [Google AI Studio](https://aistudio.google.com/).

### Instalação

1.  Clone o repositório:
    ```bash
    git clone [https://github.com/wagnerazvdo/gerador-relatorio-metaads.git](https://github.com/wagnerazvdo/gerador-relatorio-metaads.git)
    cd NOME_DO_REPOSITORIO
    ```

2.  Instale as dependências:
    ```bash
    npm install
    ```

3.  Configure as variáveis de ambiente:
    Crie um arquivo `.env.local` na raiz e adicione sua chave:
    ```env
    NEXT_PUBLIC_GEMINI_KEY=SUA_CHAVE_AQUI
    ```

4.  Inicie o servidor de desenvolvimento:
    ```bash
    npm run dev
    ```
    Acesse: `http://localhost:3000`

## 📦 Como exportar o CSV do Meta Ads

Para o funcionamento correto, exporte o relatório do Gerador de Anúncios com as seguintes colunas incluídas:
1.  **Início dos relatórios** (Data)
2.  **Nome da campanha**
3.  **Valor usado (BRL)**
4.  **Resultados / Conversas**
5.  **Alcance / Impressões**

## 🛡️ Segurança

O projeto utiliza o arquivo `.gitignore` para garantir que o `.env.local` não seja enviado publicamente, mantendo sua chave de API segura.

---
Desenvolvido para agilizar o dia a dia de Analistas de Tráfego Pago. 📈