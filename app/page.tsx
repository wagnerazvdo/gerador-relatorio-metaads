"use client";
import Papa from "papaparse";
import React, { useState } from "react";

const COLUNA_UTIL =
  /nome da campanha|valor usado|valor gasto|resultados|indicador de resultados|custo por|cliques|alcance|impress|frequ[eê]ncia|cpm|cpc|ctr|compras|conversas/i;

const LIMITE_TPM = 8000;
const MARGEM_TPM = 400;

function textoCelula(valor: unknown) {
  if (typeof valor === "string") return valor.trim();
  if (typeof valor === "number" || typeof valor === "boolean") {
    return String(valor);
  }
  return "";
}

function compactarCampanhas(linhas: Record<string, unknown>[]) {
  return linhas.map((linha) => {
    const compacta: Record<string, string> = {};
    for (const [chave, valor] of Object.entries(linha)) {
      const texto = textoCelula(valor);
      if (!texto) continue;
      if (COLUNA_UTIL.test(chave)) compacta[chave] = texto;
    }
    if (Object.keys(compacta).length === 0) {
      for (const [chave, valor] of Object.entries(linha)) {
        const texto = textoCelula(valor);
        if (texto) compacta[chave] = texto;
      }
    }
    return compacta;
  });
}

function estimarTokens(texto: string) {
  return Math.ceil(texto.length / 3);
}

function maxCompletionPara(qtdCampanhas: number) {
  return Math.min(3500, Math.max(1200, qtdCampanhas * 400));
}

class GroqApiError extends Error {}

export default function GeradorRelatorios() {
  const [dataRelatorio, setDataRelatorio] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultadoFinal, setResultadoFinal] = useState("");
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
        const getValorGasto = (linha: Record<string, string>) => {
          const raw =
            linha["Valor usado (BRL)"] ?? linha["Valor gasto (BRL)"] ?? "0";
          return parseFloat(String(raw).replace(",", "."));
        };

        const dadosFiltrados = results.data.filter(
          (linha: any) =>
            linha["Início dos relatórios"] === dataRelatorio &&
            getValorGasto(linha) > 0,
        );

        if (dadosFiltrados.length === 0) {
          alert("Nenhum dado encontrado para esta data no arquivo.");
          setLoading(false);
          return;
        }

        enviarParaGemini(dadosFiltrados);
      },
    });
  };

  const enviarParaGemini = async (dados: any[]) => {
    setLoading(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_GROQ_KEY;
      const dataFormatada = formatarDataBR(dataRelatorio);
      const campanhas = compactarCampanhas(dados);

      const montarPrompt = (lote: Record<string, string>[]) =>
        `
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
        ${JSON.stringify(lote)}
      `.replace(/^[ \t]+/gm, "").trim();

      const fatiarLotes = (lista: Record<string, string>[]) => {
        const lotes: Record<string, string>[][] = [];
        let atual: Record<string, string>[] = [];

        for (const campanha of lista) {
          const candidato = [...atual, campanha];
          const estimado =
            estimarTokens(montarPrompt(candidato)) +
            maxCompletionPara(candidato.length);
          if (atual.length > 0 && estimado > LIMITE_TPM - MARGEM_TPM) {
            lotes.push(atual);
            atual = [campanha];
          } else {
            atual = candidato;
          }
        }
        if (atual.length) lotes.push(atual);
        return lotes;
      };

      const modelos = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"];

      const chamarIAComRetry = async (
        prompt: string,
        maxCompletionTokens: number,
        tentativas = 3,
        modeloIndex = 0,
      ): Promise<string> => {
        if (modeloIndex >= modelos.length) {
          throw new Error(
            "Todos os modelos estão indisponíveis no momento. Tente novamente mais tarde.",
          );
        }

        const modeloAtual = modelos[modeloIndex];
        const url = `https://api.groq.com/openai/v1/chat/completions`;

        try {
          const response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: modeloAtual,
              messages: [{ role: "user", content: prompt }],
              temperature: 0.7,
              max_completion_tokens: maxCompletionTokens,
              reasoning_effort: "low",
            }),
          });

          const resData = await response.json();

          if (resData.error) {
            const mensagem = String(resData.error.message ?? "");
            console.log(`Erro no modelo ${modeloAtual}:`, mensagem);

            const isTpm =
              /too large|tokens per minute|TPM|reduce your message size/i.test(
                mensagem,
              );
            const isCapacidade =
              /overloaded|capacity|rate_limit/i.test(mensagem) && !isTpm;

            if (isTpm && tentativas > 0) {
              await new Promise((r) => setTimeout(r, 20000));
              return chamarIAComRetry(
                prompt,
                maxCompletionTokens,
                tentativas - 1,
                modeloIndex,
              );
            }

            if (isCapacidade) {
              console.log(
                `Tentando próximo modelo: ${modelos[modeloIndex + 1]}`,
              );
              return chamarIAComRetry(
                prompt,
                maxCompletionTokens,
                tentativas,
                modeloIndex + 1,
              );
            }

            if (tentativas > 0) {
              await new Promise((r) => setTimeout(r, 3000));
              return chamarIAComRetry(
                prompt,
                maxCompletionTokens,
                tentativas - 1,
                modeloIndex,
              );
            }

            throw new GroqApiError(mensagem);
          }

          return resData.choices[0].message.content;
        } catch (error: any) {
          if (error instanceof GroqApiError) throw error;

          console.log(`Erro de rede no modelo ${modeloAtual}:`, error.message);

          if (modeloIndex < modelos.length - 1) {
            console.log(`Tentando próximo modelo: ${modelos[modeloIndex + 1]}`);
            return chamarIAComRetry(
              prompt,
              maxCompletionTokens,
              tentativas,
              modeloIndex + 1,
            );
          }

          throw error;
        }
      };

      const lotes = fatiarLotes(campanhas);
      const partes: string[] = [];

      for (let i = 0; i < lotes.length; i++) {
        if (i > 0) {
          await new Promise((r) => setTimeout(r, 20000));
        }
        const prompt = montarPrompt(lotes[i]);
        const textoLote = await chamarIAComRetry(
          prompt,
          maxCompletionPara(lotes[i].length),
        );
        partes.push(textoLote.trim());
      }

      setResultadoFinal(partes.join("\n[DIVIDER]\n"));
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
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
              🚀 Gerador de Relatórios Meta
            </h1>
            <p className="text-gray-600 font-medium italic">
              Análise inteligente (SITE, REC & MSG)
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                1. Selecione a Data
              </label>
              <input
                type="date"
                className="w-full p-4 rounded-xl border-2 border-gray-300 font-semibold focus:border-blue-600 outline-none transition-all shadow-sm"
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
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-4 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer shadow-sm"
                onChange={processarCSV}
              />
            </div>
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center py-16 space-y-6">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-b-blue-600"></div>
              <p className="text-blue-700 font-bold text-lg animate-pulse text-center">
                IA identificando campanhas e gerando relatórios...
              </p>
            </div>
          )}

          {resultadoFinal && !loading && (
            <div className="mt-8 space-y-6">
              <div className="flex items-center justify-between mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                <h2 className="text-lg font-black text-gray-800 uppercase tracking-tight">
                  Relatórios Gerados ✅
                </h2>
                <button
                  onClick={handleCopy}
                  className={`px-6 py-2 rounded-xl text-sm font-black transition-all transform active:scale-95 shadow-md ${
                    copiado
                      ? "bg-green-500 text-white"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {copiado ? "✅ COPIADO TUDO!" : "📋 COPIAR TUDO"}
                </button>
              </div>

              {resultadoFinal
                .split("[DIVIDER]")
                .filter((res) => res.trim() !== "")
                .map((relatorio, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-2xl shadow-md border-2 border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500"
                  >
                    <div className="bg-gray-50 px-6 py-3 border-b-2 border-gray-200 flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                        Relatório #{index + 1}
                      </span>
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
