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

"Quero ir hoje" pega a próxima vaga do dia. Remarcar e cancelar ficam na
primeira tela, no mesmo aparelho.

## Nova barbearia

Copie `tenants/modelo.js`, troque nome, cores, horários, equipe e serviços, e
inclua o arquivo em `index.html`. `node build.mjs` gera o arquivo único;
`node build.mjs --tenants=dom-pinho` gera só uma marca.

## Limite desta versão

É uma demonstração: os agendamentos ficam no navegador de quem usa
(`localStorage`), então cliente e barbeiro em aparelhos diferentes ainda não
enxergam a mesma agenda. Toda a leitura e gravação está em `js/core.js`, que é
o ponto a ligar num servidor para ir ao ar.
