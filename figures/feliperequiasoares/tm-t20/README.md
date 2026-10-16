# TM-T20: impressora térmica

Uma impressora térmica de cupom TM-T20 preta, em escala real (140 × 199 × 146 mm, papel de 80 mm), sobre uma base de balcão. O botão do painel solta a tampa, que gira na dobradiça traseira e mostra o rolo de papel sobre a cabeça térmica. A tampa fecha, o cupom sai linha por linha pela fenda da frente e a guilhotina automática corta.

A tampa é refeita a cada quadro no navegador: o perfil dela gira em torno da dobradiça e é projetado de novo, então o ângulo mostrado no painel é o ângulo real desenhado.

## Experimente

- **Toque na impressora:** percorre as cinco etapas (Abrir tampa → Rolo de 80 mm → Fechar → Imprimir → Cortar). As setas ← → andam uma etapa por vez.
- **Segure FEED** (ou a tecla **F**): o papel avança em branco enquanto o botão está apertado, até 60 mm. Ao soltar, a guilhotina corta e a tira sai. Um toque rápido avança uma linha. Com a tampa aberta ou durante uma impressão, o FEED não responde, como na impressora real.
- **Fim do papel:** cada cupom e cada FEED gastam o rolo, que encolhe de verdade (o raio segue a área de papel que sobra). O painel mostra quanto resta. Quando não há papel para um cupom inteiro, o **LED PAPER** acende laranja e a impressão para; ao tocar na impressora, a tampa abre e entra um rolo novo antes de imprimir.
- **Chave liga/desliga** na lateral direita (ou a tecla **L**), com as marcas I/O. Desligada, os LEDs apagam e a figura para onde estava; ao religar, continua dali.
- **LEDs:** POWER verde com a chave ligada, ERROR pisca com a tampa aberta, PAPER no fim do rolo.
- **Tema:** Claro, Escuro ou Blueprint no seletor do topo. A escolha fica salva no navegador.

## Medidas e escopo

Corpo de 140 × 199 × 146 mm e papel térmico de 80 mm, como na ficha da impressora. O cupom tem 74 mm. Para que o fim do papel apareça em poucos minutos, o rolo da figura tem 300 mm (cerca de quatro cupons), muito menos que um rolo real. A velocidade do FEED e o tempo das etapas também foram ajustados para leitura. A marca do fabricante foi tirada de propósito: a frente mostra só "TM-T20".

## Validação

Build determinístico (dois builds dão os mesmos bytes), checagem de linhas do kit sem erros, e uma pose parada com `prefers-reduced-motion`. FEED, fim do papel, troca do rolo e chave liga/desliga foram testados no navegador, nos três temas, sem erros no console.

## Build

A partir da raiz do repositório, com o kit do Anatomy em `.skill`:

```sh
node figures/feliperequiasoares/tm-t20/src/build.mjs
```

Feito com Claude Code (claude-opus-5-5) e a skill Anatomy. Licença MIT.
