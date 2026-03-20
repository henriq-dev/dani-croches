/* =====================================================
   DANIZINHA CROCHÊ — javascript/javascript.js
   Módulos:
   1. Carrinho de compras
   2. Galeria de imagens dos cards
   3. Lightbox (visualização ampliada)
===================================================== */

/* =====================================================
   1. CARRINHO DE COMPRAS
   Estado: array global de objetos { nome, preco, qty }
===================================================== */

let cart = [];

/**
 * Altera a quantidade no seletor +/- do card.
 * @param {HTMLElement} btn - botão clicado (+ ou -)
 * @param {number}      dir - +1 aumenta, -1 diminui
 */
function changeQty(btn, dir) {
  const qtyEl = btn.parentElement.querySelector('.qty-num');
  let qty = parseInt(qtyEl.textContent) + dir;
  if (qty < 1) qty = 1; /* mínimo 1 unidade */
  qtyEl.textContent = qty;
}

/**
 * Adiciona produto ao carrinho.
 * Se já existir, soma a quantidade em vez de duplicar.
 * @param {HTMLElement} btn   - botão "Adicionar ao carrinho"
 * @param {string}      nome  - nome do produto
 * @param {number}      preco - preço unitário em reais
 */
function addToCart(btn, nome, preco) {
  const qty = parseInt(btn.closest('.card-body').querySelector('.qty-num').textContent);

  const existing = cart.find(i => i.nome === nome);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ nome, preco, qty });
  }

  renderCart();

  /* Feedback visual no botão por 1.5 segundos */
  btn.textContent = '✅ Adicionado!';
  setTimeout(() => { btn.textContent = '🛒 Adicionar ao carrinho'; }, 1500);

  /* Rola suavemente até o carrinho */
  document.getElementById('carrinho').scrollIntoView({ behavior: 'smooth' });
}

/**
 * Remove um item do carrinho pelo nome.
 * @param {string} nome - nome do produto a remover
 */
function removeFromCart(nome) {
  cart = cart.filter(i => i.nome !== nome);
  renderCart();
}

/**
 * Re-renderiza a lista do carrinho no HTML e atualiza o total.
 * Chamada sempre que o carrinho muda (add / remove).
 */
function renderCart() {
  const listEl  = document.getElementById('cart-list');
  const totalEl = document.getElementById('cart-total');

  if (cart.length === 0) {
    listEl.innerHTML = '<li style="color:var(--muted);text-align:center;padding:20px 0">Seu carrinho está vazio 🧶</li>';
    totalEl.textContent = 'Total: R$ 0,00';
    return;
  }

  /* Monta cada item com template literal */
  listEl.innerHTML = cart.map(item => `
    <li class="cart-item">
      <div class="cart-item-left">
        <span>${item.nome}</span>
        <span class="cart-item-qty">${item.qty}x · R$ ${(item.preco * item.qty).toFixed(2).replace('.', ',')}</span>
        <button class="remove-btn" onclick="removeFromCart('${item.nome}')">✕ Remover</button>
      </div>
      <span>R$ ${(item.preco * item.qty).toFixed(2).replace('.', ',')}</span>
    </li>
  `).join('');

  /* reduce() soma todos os itens para calcular o total */
  const soma = cart.reduce((acc, i) => acc + i.preco * i.qty, 0);
  totalEl.textContent = `Total: R$ ${soma.toFixed(2).replace('.', ',')}`;
}

/**
 * Monta a mensagem de pedido e abre o WhatsApp.
 * encodeURIComponent() converte acentos e emojis para URL.
 */
function checkoutWhatsApp() {
  if (cart.length === 0) { alert('Adicione produtos ao carrinho primeiro!'); return; }

  const itens = cart.map(i =>
    `• ${i.qty}x ${i.nome} - R$ ${(i.preco * i.qty).toFixed(2).replace('.', ',')}`
  ).join('\n');

  const total = cart.reduce((acc, i) => acc + i.preco * i.qty, 0);
  const msg   = `Olá Dani! 🧶 Quero fazer um pedido:\n\n${itens}\n\nTotal: R$ ${total.toFixed(2).replace('.', ',')}\n\nPode me confirmar disponibilidade?`;

  window.open(`https://wa.me/556999877726?text=${encodeURIComponent(msg)}`, '_blank');
}

/**
 * Exibe instruções de pagamento via PIX.
 * Troque "(sua chave aqui)" pela chave PIX real.
 */
function checkoutPix() {
  if (cart.length === 0) { alert('Adicione produtos ao carrinho primeiro!'); return; }

  const total = cart.reduce((acc, i) => acc + i.preco * i.qty, 0);
  alert(
    `💠 Pagamento via PIX\n\n` +
    `Valor: R$ ${total.toFixed(2).replace('.', ',')}\n\n` +
    `Chave PIX: (sua chave aqui)\n\n` +
    `Após o pagamento, envie o comprovante pelo WhatsApp! 💛`
  );
}

/* =====================================================
   2. GALERIA DE IMAGENS DOS CARDS
   Inicializado com DOMContentLoaded para garantir
   que o HTML já foi carregado antes de ser manipulado.
===================================================== */
document.addEventListener('DOMContentLoaded', () => {

  document.querySelectorAll('[data-gallery]').forEach(gallery => {
    const imgs = gallery.querySelectorAll('.gallery-img');
    const dots = gallery.querySelectorAll('.gallery-dot');

    /* Card com 1 foto: clique abre o lightbox direto */
    if (imgs.length <= 1 || dots.length === 0) {
      imgs.forEach(img => {
        img.addEventListener('click', () => openLightbox([img.src], 0));
      });
      return;
    }

    /**
     * Troca a imagem ativa da galeria.
     * @param {number} idx - índice da imagem desejada
     */
    function goTo(idx) {
      imgs.forEach(i => i.classList.remove('active'));
      dots.forEach(d => d.classList.remove('active'));
      imgs[idx].classList.add('active');
      dots[idx].classList.add('active');
    }

    /* Cada dot navega para o índice definido no atributo data-idx */
    dots.forEach(dot => {
      dot.addEventListener('click', () => goTo(parseInt(dot.dataset.idx)));
    });

    /* Clique na imagem abre o lightbox com todas as fotos do produto */
    imgs.forEach((img, idx) => {
      img.addEventListener('click', () => {
        openLightbox(Array.from(imgs).map(i => i.src), idx);
      });
    });
  });

  /* =====================================================
     3. LIGHTBOX
     Visualização ampliada com navegação entre fotos.
     As funções são expostas no window para o HTML inline.
  ===================================================== */

  let lbImages = []; /* array de URLs da galeria atual */
  let lbIndex  = 0;  /* índice da imagem exibida */

  /**
   * Abre o lightbox com um conjunto de imagens.
   * @param {string[]} images - array de URLs
   * @param {number}   idx    - índice inicial a exibir
   */
  window.openLightbox = function(images, idx) {
    lbImages = images;
    lbIndex  = idx;
    document.getElementById('lightbox-img').src = lbImages[lbIndex];
    document.getElementById('lightbox').classList.add('active');
  };

  /** Fecha o lightbox removendo a classe .active */
  window.closeLightbox = function() {
    document.getElementById('lightbox').classList.remove('active');
  };

  /**
   * Navega entre imagens do lightbox.
   * O módulo (%) faz o índice "dar a volta" no array.
   * @param {number} dir - +1 próxima, -1 anterior
   */
  window.lightboxNav = function(dir) {
    lbIndex = (lbIndex + dir + lbImages.length) % lbImages.length;
    document.getElementById('lightbox-img').src = lbImages[lbIndex];
  };

  /* Fecha ao clicar no overlay escuro (fora da imagem) */
  document.getElementById('lightbox').addEventListener('click', function(e) {
    if (e.target === this) closeLightbox();
  });

  /* Navegação por teclado */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape')      closeLightbox();
    if (e.key === 'ArrowLeft')   lightboxNav(-1);
    if (e.key === 'ArrowRight')  lightboxNav(1);
  });

}); /* fim do DOMContentLoaded */