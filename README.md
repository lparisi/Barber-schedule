# Agenda de barbearia (white label)

Site de agendamento em que o cliente marca horário só com **nome e celular**,
sem login. Inclui o painel da equipe, com a agenda de cada profissional
separada e encaixe de clientes sem hora marcada.

## Como abrir

Abra `dist/index.html` no navegador (arquivo único, sem instalação), ou sirva a
pasta com `npx serve .`. O painel fica em "Sou da equipe" (ou `#painel`), PIN
de demonstração `1234`.

## Fluxo do cliente

1. Escolhe por **serviço** ou por **profissional** já na primeira tela.
2. Completa a outra metade: "Primeiro disponível" ou um profissional; um
   serviço ou "Decido na hora".
3. Toca num horário.
4. Confirma nome e celular (preenchidos sozinhos da segunda vez em diante).

O cartão "Próximo horário disponível" leva direto à primeira vaga. Remarcar e
cancelar ficam na primeira tela, no mesmo aparelho.

## Horários e adicionais

- A agenda tem precisão de 5 minutos (`grid`). A duração de cada serviço é
  qualquer múltiplo de 5, e no painel o barbeiro escolhe a duração de cada
  horário, ajusta depois, e ao concluir antes do previsto o tempo que sobrou
  volta a ficar livre.
- Ao cliente são oferecidos os inícios que não deixam buraco na agenda
  (encostados no atendimento anterior ou no seguinte). `clientSlots: 'all'`
  mostra todos os inícios de 5 em 5 minutos.
- Na confirmação, o cliente pode somar serviços marcados com `extra: true`.
  Se o adicional não cabe depois do horário escolhido, a oferta mostra o
  horário mais próximo do dia em que o total cabe e muda para ele ao tocar;
  duração e valor se atualizam, e partes que formam um combo (`bundle`)
  cobram o preço do combo.

## Privacidade (LGPD)

- Pede primeiro nome e celular. O celular serve para a confirmação no
  WhatsApp e é configurável por barbearia (`askPhone`: `required`, `optional`
  ou `off`). Sem login, cookies ou rastreamento.
- Cada horário recebe um código sorteado, mostrado também em QR code. Ele não
  é derivado de nenhum dado da pessoa (um hash de celular seria reversível).
- Nome e celular existem só enquanto o horário está em aberto: são apagados na
  hora em que o atendimento é concluído, cancelado ou marcado como falta, e
  nada com nome passa da virada do dia. Sobra o registro anônimo do serviço.
- "Privacidade" na primeira tela explica isso e tem "Apagar todos os meus
  dados": cancela os horários em aberto, apaga nome e celular da agenda e
  limpa o aparelho.
- O aparelho do cliente guarda só a referência do horário; nome e celular
  apenas se a pessoa ligar "Lembrar neste aparelho".

## Interface

Segue as Human Interface Guidelines da Apple: alvos de toque de 44 pt, texto
base de 17 pt, folhas com Cancelar à esquerda, botão principal desligado até
os dados obrigatórios estarem certos, validação ao sair do campo, interruptor
dentro de linha de lista, tema claro e escuro, menos movimento quando o
sistema pede.

## Nova barbearia

Copie `tenants/modelo.js`, troque nome, cores, horários, equipe e serviços, e
inclua o arquivo em `index.html`. `node build.mjs` gera o arquivo único;
`node build.mjs --tenants=dom-pinho` gera só uma marca.

## Confirmação no WhatsApp

O texto da confirmação vem de `B.confirmText` em `js/core.js`. Nesta versão ele
aparece como prévia para o cliente, e a equipe pode enviá-lo com um toque pelo
painel (abre o WhatsApp da barbearia com a mensagem pronta). O envio automático
depende de um servidor ligado à API oficial do WhatsApp Business.

## Limite desta versão

É uma demonstração: os agendamentos ficam no navegador de quem usa
(`localStorage`), então cliente e barbeiro em aparelhos diferentes ainda não
enxergam a mesma agenda. Toda a leitura e gravação está em `js/core.js`, que é
o ponto a ligar num servidor para ir ao ar.
