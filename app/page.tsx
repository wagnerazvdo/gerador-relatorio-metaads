"use client";
import React, { useState } from 'react';
import Papa from 'papaparse';

export default function GeradorRelatorios() {
  const [dataRelatorio, setDataRelatorio] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultadoFinal, setResultadoFinal] = useState('');
  const [copiado, setCopiado] = useState(false);

  // Função para formatar a data de YYYY-MM-DD para DD/MM/YYYY
  const formatarDataBR = (dataString: string) => {
    if (!dataString) return "";
    const [ano, mes, dia] = dataString.split("-");
    return `${dia}/${mes}/${ano}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(resultadoFinal);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const processarCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !dataRelatorio) {
      alert("Por favor, selecione a data e o arquivo CSV!");
      return;
    }

    setLoading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const dadosFiltrados = results.data.filter((linha: any) => 
          linha["Início dos relatórios"] === dataRelatorio && 
          parseFloat(linha["Valor usado (BRL)"]) > 0
        );

        if (dadosFiltrados.length === 0) {
          alert("Nenhum dado encontrado para esta data no arquivo.");
          setLoading(false);
          return;
        }

        enviarParaGemini(dadosFiltrados);
      }
    });
  };

  const enviarParaGemini = async (dados: any[]) => {
    setLoading(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_KEY;
      const dataFormatada = formatarDataBR(dataRelatorio);
      
      const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
      const listRes = await fetch(listUrl);
      const listData = await listRes.json();
      
      const modelDisponivel = listData.models.find((m: any) =>
        m.supportedGenerationMethods.includes("generateContent")
      ).name;

      const prompt = `
        Atue como um analista de tráfego pago. Gere relatórios individuais para cada campanha com gasto.
        Data do Relatório: ${dataFormatada}

        ⚠️ REGRAS DE FORMATAÇÃO OBRIGATÓRIAS:
        1. Moeda: Use sempre R$ com VÍRGULA para decimais (ex: R$ 10,50 e não R$ 10.50).
        2. Data: Use o formato DD/MM/YYYY.
        3. Layout: Siga exatamente o modelo abaixo:

        🔹 Relatório de Desempenho da Campanha
        
        📌 Campanha: [NOME DA CAMPANHA]
        📅 Data: ${dataFormatada}
        🎯 Objetivo: [Se o nome tiver MSG é Geração de conversas, se tiver REC é Alcance]

        Resultados principais:
        ✅ Conversas iniciadas: [VALOR]
        ✅ Investimento total do dia: R$ [VALOR COM VÍRGULA]
        ✅ Custo por conversa iniciada: R$ [VALOR COM VÍRGULA]
        📢 Alcance: [VALOR] pessoas
        👁️ Impressões: [VALOR]
        🔁 Frequência: [VALOR COM VÍRGULA]
        💸 CPM (custo por mil): R$ [VALOR COM VÍRGULA]
        🖱️ Cliques (todos): [VALOR]
        💰 CPC: R$ [VALOR COM VÍRGULA]
        📈 CTR: [VALOR COM VÍRGULA]%

        Efetividade: [1 frase de análise]
        
        Recomendações: [2 tópicos curtos]
        ---
        DADOS: ${JSON.stringify(dados)}
      `;

      const url = `https://generativelanguage.googleapis.com/v1beta/${modelDisponivel}:generateContent?key=${apiKey}`;

      const chamarIAComRetry = async (tentativas = 3): Promise<string> => {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const resData = await response.json();
        if (resData.error) {
          if (resData.error.message.includes("overloaded") && tentativas > 0) {
            await new Promise(r => setTimeout(r, 3000));
            return chamarIAComRetry(tentativas - 1);
          }
          throw new Error(resData.error.message);
        }
        return resData.candidates[0].content.parts[0].text;
      };

      const texto = await chamarIAComRetry();
      setResultadoFinal(texto);
    } catch (error: any) {
      alert("Erro: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-200">
          <header className="text-center mb-10">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">🚀 Gerador de Relatórios Meta</h1>
            <p className="text-gray-600 font-medium">Análise inteligente de tráfego pago</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                1. Selecione a Data
              </label>
              <input 
                type="date" 
                className="w-full p-4 rounded-xl border-2 border-gray-300 bg-white text-gray-900 font-semibold focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none transition-all shadow-sm"
                onChange={(e) => setDataRelatorio(e.target.value)} 
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                2. Upload do CSV
              </label>
              <input 
                type="file" 
                accept=".csv" 
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-4 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer shadow-sm transition-all"
                onChange={processarCSV} 
              />
            </div>
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center py-16 space-y-6">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-b-blue-600"></div>
              <div className="text-center">
                <p className="text-blue-700 font-bold text-lg animate-pulse">Gerando Relatórios...</p>
                <p className="text-gray-500 text-sm italic">Isso pode levar alguns segundos dependendo do volume de dados.</p>
              </div>
            </div>
          )}

          {resultadoFinal && !loading && (
            <div className="mt-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
              <div className="flex items-center justify-between mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                <h2 className="text-lg font-black text-gray-800 uppercase tracking-tight">Relatórios Prontos ✨</h2>
                <button 
                  onClick={handleCopy}
                  className={`px-6 py-2 rounded-xl text-sm font-black transition-all transform active:scale-95 shadow-md ${
                    copiado ? 'bg-green-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {copiado ? '✅ COPIADO!' : '📋 COPIAR TUDO'}
                </button>
              </div>
              <div className="bg-gray-50 rounded-2xl p-6 text-gray-800 font-medium text-sm overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-inner border-2 border-gray-200 min-h-[300px]">
                {resultadoFinal}
              </div>
            </div>
          )}
        </div>
        
        <footer className="mt-8 text-center text-gray-400 text-xs">
          Gerador de Relatórios via Google Gemini 3 Flash • 2026
        </footer>
      </div>
    </main>
  );
}