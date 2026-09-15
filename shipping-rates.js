// shipping-rates.js - Açaí Prime
// Tabela de frete por zona + cálculo de imposto/taxa
window.ShippingRates = {
    defaultRate: 7.00,
    impostoPercent: 0.00,
    impostoFixo: 0.00,
    zones: [
        { name: 'Centro', patterns: ['centro','av paulista','avenida paulista','rua principal','praca central'], rate: 5.00, description: 'Centro - entrega rapida' },
        { name: 'Zona Norte', patterns: ['zona norte','jardim','vila','bairro norte','parque norte'], rate: 6.50, description: 'Zona Norte' },
        { name: 'Zona Sul', patterns: ['zona sul','bairro sul','vila sao','parque sul','avenida sul'], rate: 7.50, description: 'Zona Sul' },
        { name: 'Zona Leste', patterns: ['zona leste','bairro leste','vila leste','av leste','rua leste'], rate: 8.50, description: 'Zona Leste' },
        { name: 'Zona Oeste', patterns: ['zona oeste','bairro oeste','vila oeste','av oeste','rua oeste'], rate: 9.00, description: 'Zona Oeste' }
    ],
    normalizeText(text) {
        return (text||'').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').trim();
    },
    getRate(address, tipoEntrega) {
        if (tipoEntrega === 'retirada') return { zone: 'Retirada na loja', rate: 0, description: 'Sem taxa' };
        const n = this.normalizeText(address);
        if (!n) return { zone: 'Endereco nao informado', rate: this.defaultRate, description: 'Frete padrao' };
        for (const z of this.zones) if (z.patterns.some(p=> n.includes(this.normalizeText(p)))) return { zone: z.name, rate: z.rate, description: z.description };
        return { zone: 'Zona geral', rate: this.defaultRate, description: 'Frete padrao' };
    },
    calculateTotal(address, subtotal, tipoEntrega) {
        const ship = this.getRate(address, tipoEntrega);
        const frete = parseFloat(ship.rate.toFixed(2));
        const imposto = parseFloat(((subtotal * this.impostoPercent) + this.impostoFixo).toFixed(2));
        const total = parseFloat((subtotal + frete + imposto).toFixed(2));
        return { address: address||'Nao informado', zone: ship.zone, shippingRate: frete, shippingDescription: ship.description, imposto, impostoPercent: this.impostoPercent, subtotal: parseFloat(subtotal.toFixed(2)), total };
    }
};
