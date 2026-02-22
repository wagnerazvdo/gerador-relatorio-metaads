"use client";
import Papa from 'papaparse';
import React, { useState } from 'react';

export default function GeradorRelatorios() {
  const [dataRelatorio, setDataRelatorio] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultadoFinal, setResultadoFinal] = useState('');
  const [copiado, setCopiado] = useState(false);

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
        1. Moeda: Use sempre R$ com VÍRGULA para decimais (ex: R$ 10,50).
        2. Data: Use o formato DD/MM/YYYY.
        3. Se o nome da campanha tiver "(SITE)", use o MODELO SITE.
        4. Se o nome da campanha tiver "(MSG)" ou "(REC)", use o MODELO MSG/REC (mantendo o layout original).

        ---
        MODELO SITE (Quando tiver "SITE" no nome):
        🔹 Relatório de Desempenho da Campanha
        
        📌 Campanha: [NOME DA CAMPANHA]
        📅 Data: ${dataFormatada}
        🎯 Objetivo: Tráfego para o site

        Resultados principais:
        ✅ Cliques no link: [VALOR]
        ✅ Investimento total do dia: R$ [VALOR COM VÍRGULA]
        ✅ Custo por clique no link: R$ [VALOR COM VÍRGULA]
        ✅ Compras no site: [VALOR]
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
        MODELO MSG/REC (Mesmo layout original):
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
        ⚠️ IMPORTANTE: Separe cada relatório de campanha usando exatamente a palavra: [DIVIDER]
        ---
        DADOS EM JSON:
        ${JSON.stringify(dados)}
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
      <div className="max-w-3xl mx-auto text-gray-800">
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-200">
          <header className="text-center mb-10">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">🚀 Gerador de Relatórios Meta</h1>
            <p className="text-gray-600 font-medium italic">Análise inteligente (SITE & MSG)</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">1. Selecione a Data</label>
              <input type="date" className="w-full p-4 rounded-xl border-2 border-gray-300 font-semibold focus:border-blue-600 outline-none transition-all shadow-sm" onChange={(e) => setDataRelatorio(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">2. Upload do CSV</label>
              <input type="file" accept=".csv" className="block w-full text-sm text-gray-500 file:mr-4 file:py-4 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer shadow-sm" onChange={processarCSV} />
            </div>
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center py-16 space-y-6">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-b-blue-600"></div>
              <p className="text-blue-700 font-bold text-lg animate-pulse text-center">IA identificando campanhas e gerando relatórios...</p>
            </div>
          )}

          {resultadoFinal && !loading && (
            <div className="mt-8 space-y-6">
              <div className="flex items-center justify-between mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                <h2 className="text-lg font-black text-gray-800 uppercase tracking-tight">Relatórios Gerados ✅</h2>
                <button 
                  onClick={handleCopy}
                  className={`px-6 py-2 rounded-xl text-sm font-black transition-all transform active:scale-95 shadow-md ${
                    copiado ? 'bg-green-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {copiado ? '✅ COPIADO TUDO!' : '📋 COPIAR TUDO'}
                </button>
              </div>

              {resultadoFinal.split('[DIVIDER]').filter(res => res.trim() !== "").map((relatorio, index) => (
                <div key={index} className="bg-white rounded-2xl shadow-md border-2 border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-gray-50 px-6 py-3 border-b-2 border-gray-200 flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Relatório #{index + 1}</span>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(relatorio.trim());
                      }}
                      className="text-xs font-bold bg-gray-200 hover:bg-blue-600 hover:text-white text-gray-700 px-3 py-1 rounded-lg transition-all"
                    >
                      📋 COPIAR
                    </button>
                  </div>
                  <div className="p-6 text-gray-800 font-medium text-sm whitespace-pre-wrap leading-relaxed">
                    {relatorio.trim()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}