class MTGProxyGenerator {
    constructor() {
        this.cards = [];
        this.initializeElements();
        this.attachEventListeners();
    }

    initializeElements() {
        this.searchInput = document.getElementById('searchInput');
        this.searchBtn = document.getElementById('searchBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.printBtn = document.getElementById('printBtn');
        this.cardResults = document.getElementById('cardResults');
        this.loading = document.getElementById('loading');
        this.error = document.getElementById('error');
        this.cardCount = document.getElementById('cardCount');
        this.listBtn = document.getElementById('listBtn');
        this.listModal = document.getElementById('listModal');
        this.cardListInput = document.getElementById('cardListInput');
        this.addListBtn = document.getElementById('addListBtn');
        this.cancelListBtn = document.getElementById('cancelListBtn');
        this.closeModal = document.getElementById('closeModal');
    }

    attachEventListeners() {
        this.searchBtn.addEventListener('click', () => this.searchCards());
        this.clearBtn.addEventListener('click', () => this.clearCards());
        this.printBtn.addEventListener('click', () => this.printCards());
        this.listBtn.addEventListener('click', () => {
            this.listModal.classList.remove('hidden')
        })
        this.addListBtn.addEventListener('click', () => {
            const list = this.cardListInput.value.trim()
            if (list) {
                const cardNames = list.split('\n').map(name => name.trim()).filter(name => name);
                this.searchMultipleCards(cardNames);
                this.cardListInput.value = ''
                this.listModal.classList.add('hidden')
            } else {
                this.showError('Please enter at least one card name.')
            }
        })

        this.cancelListBtn.addEventListener('click', () => {
            this.cardListInput.value = ''
            console.log('List modal cancelled');
        })

        this.closeModal.addEventListener('click', () => {
            this.cardListInput.value = ''
            this.listModal.classList.add('hidden')
        })
        /* this.listBtn.addEventListener('click', () => {
            this.listModal.classList.remove('hidden');
            console.log('List modal opened');
        });

        this.addListBtn.addEventListener('click', () => {
            const list = this.cardListInput.value.trim();
            if (list) {
                const cardNames = list.split('\n').map(name => name.trim()).filter(name => name);
                this.searchMultipleCards(cardNames);
                this.cardListInput.value = '';
                this.listModal.classList.add('hidden');
            }
        }); */
        
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchCards();
            }
        });
    }

    async searchCards() {
        const query = this.searchInput.value.trim();
        if (!query) {
            this.showError('Please enter a card name to search');
            return;
        }

        this.showLoading();
        this.hideError();

        try {
            // First try exact name search
            let response = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(query)}`);
            
            if (response.ok) {
                const card = await response.json();
                this.addCard(card);
            } else {
                // If exact search fails, try search API
                response = await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&order=name`);
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.data && data.data.length > 0) {
                        // Add first 10 results
                        const cardsToAdd = data.data.slice(0, 10);
                        cardsToAdd.forEach(card => this.addCard(card));
                    } else {
                        this.showError('No cards found. Try a different search term.');
                    }
                } else {
                    this.showError('No cards found. Try a different search term.');
                }
            }
        } catch (error) {
            console.error('Search error:', error);
            this.showError('Error searching for cards. Please try again.');
        } finally {
            this.hideLoading();
        }
   }

    async searchMultipleCards(cardNames) {
        if (!Array.isArray(cardNames) || cardNames.length === 0) {
            this.showError('Please provide a list of card names.');
            return;
        }

        this.showLoading();
        this.hideError();

        for (const name of cardNames) {
            const query = name.trim();
            if (!query) continue;
            try {
                let response = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(query)}`);
                if (response.ok) {
                    const card = await response.json();
                    this.addCard(card);
                } else {
                    this.showError(`Card not found: ${query}`);
                }
            } catch (error) {
                console.error('Search error:', error);
                this.showError(`Error searching for card: ${query}`);
            }
        }

        this.hideLoading();
    }

    addCard(cardData) {
        // Avoid duplicates
        if (this.cards.find(card => card.id === cardData.id)) {
            return;
        }

        this.cards.push(cardData);
        this.renderCard(cardData);
        this.updateCardCount();
    }

    renderCard(card) {
        const cardElement = document.createElement('div');
        cardElement.className = 'card-proxy';
        cardElement.dataset.cardId = card.id;

        // Handle card faces (for double-faced cards)
        const face = card.card_faces ? card.card_faces[0] : card;
        
        // Clean mana cost for display
        const manaCost = this.formatManaCost(face.mana_cost || '');
        
        // Format card text
        const oracleText = this.formatOracleText(face.oracle_text || '');
        
        // Power/Toughness for creatures
        const powerToughness = face.power && face.toughness ? 
            `${face.power}/${face.toughness}` : '';

        cardElement.innerHTML = `
            <button class="remove-btn" onclick="app.removeCard('${card.id}')" title="Remove card">×</button>
            
            <div class="card-header">
                <div class="card-name">${face.name}</div>
                <div class="mana-cost">${manaCost}</div>
            </div>
            
            <div class="card-image-placeholder">
                [Card Image]
            </div>
            
            <div class="card-type">${face.type_line}</div>
            
            <div class="card-text">${oracleText}</div>
            
            <div class="card-bottom">
                <div class="set-info">${card.set_name} (${card.set.toUpperCase()})</div>
                ${powerToughness ? `<div class="power-toughness">${powerToughness}</div>` : ''}
            </div>
        `;

        this.cardResults.appendChild(cardElement);
    }

    removeCard(cardId) {
        this.cards = this.cards.filter(card => card.id !== cardId);
        const cardElement = document.querySelector(`[data-card-id="${cardId}"]`);
        if (cardElement) {
            cardElement.remove();
        }
        this.updateCardCount();
    }

    clearCards() {
        this.cards = [];
        this.cardResults.innerHTML = '';
        this.updateCardCount();
        this.searchInput.value = '';
    }

    printCards() {
        if (this.cards.length === 0) {
            this.showError('No cards to print. Search for cards first.');
            return;
        }
        
        window.print();
    }

    formatManaCost(manaCost) {
        if (!manaCost) return '';
        
        // Simply remove braces and return the text
        return manaCost.replace(/[{}]/g, '');
    }

    formatOracleText(text) {
        if (!text) return '';
        
        // Limit text length for proxy
        if (text.length > 200) {
            text = text.substring(0, 200) + '...';
        }
        
        // Simply remove braces and format line breaks
        return text.replace(/[{}]/g, '').replace(/\n/g, ' • ');
    }

    updateCardCount() {
        this.cardCount.textContent = this.cards.length;
    }

    showLoading() {
        this.loading.classList.remove('hidden');
    }

    hideLoading() {
        this.loading.classList.add('hidden');
    }

    showError(message) {
        this.error.textContent = message;
        this.error.classList.remove('hidden');
        setTimeout(() => {
            this.hideError();
        }, 5000);
    }

    hideError() {
        this.error.classList.add('hidden');
    }
}

// Initialize the application
const app = new MTGProxyGenerator();

// Add some example searches on load
document.addEventListener('DOMContentLoaded', () => {
    console.log('MTG Proxy Generator loaded');
    console.log('Try searching for cards like: "Lightning Bolt", "Counterspell", "Sol Ring"');
});