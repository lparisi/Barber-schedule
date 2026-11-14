// Marca: Dom Pinho Barbearia. Serviços, preços, endereço e horários copiados do
// sistema atual (suaagenda.net) em nov/2026. Para trocar de barbearia, basta
// criar outro arquivo como este: nada no código do app muda.
(window.TENANTS = window.TENANTS || []).push({
  id: 'dom-pinho',
  name: 'Dom Pinho Barbearia',
  city: 'Campeche, Florianópolis',
  address: 'Rod. Francisco Magno Vieira, 4397 · Campeche, Florianópolis - SC',
  phone: '(48) 99839-0862',
  accent: { light: '#1F5F4A', dark: '#5FD0A8' },
  grid: 5,               // precisão da agenda, em minutos
  // Celular do cliente: 'required' (recebe a confirmação no WhatsApp),
  // 'optional' ou 'off'.
  askPhone: 'required',
  pin: '1234',           // PIN do painel da equipe (demonstração)
  // 0 = domingo ... 6 = sábado. Cada dia: lista de períodos [início, fim].
  hours: {
    1: [['10:00', '12:00'], ['13:00', '18:00']],
    2: [['09:00', '12:00'], ['13:00', '19:00']],
    3: [['09:00', '12:00'], ['13:00', '19:00']],
    4: [['09:00', '12:00'], ['13:00', '19:00']],
    5: [['09:00', '12:00'], ['13:00', '19:30']],
    6: [['09:00', '12:00'], ['13:00', '17:00']]
  },
  // Cada profissional tem agenda própria. `services: null` = faz todos.
  // `off` = dias da semana de folga. `hours` (opcional) substitui o da casa.
  pros: [
    { id: 'rauha', name: 'Rauhã Pinho', role: 'Barbeiro', services: null, off: [] },
    // Os dois abaixo são EXEMPLOS para demonstrar agendas separadas.
    { id: 'pro2', name: 'Caio Martins', role: 'Barbeiro', services: null, off: [1] },
    { id: 'pro3', name: 'Miguel Duarte', role: 'Barbeiro', services: ['corte', 'barba', 'corte-barba', 'maquina', 'sobrancelha'], off: [3] }
  ],
  // `min` aceita qualquer múltiplo de 5. `extra: true` = oferecido como
  // adicional na confirmação. `kind` evita oferecer dois serviços do mesmo tipo.
  // `bundle` = combo: quem soma as partes paga o preço e o tempo do combo.
  services: [
    { id: 'corte', name: 'Corte', price: 60, min: 30, group: 'Cabelo e barba' },
    { id: 'barba', name: 'Barba Simples', price: 40, min: 30, extra: true, kind: 'barba', group: 'Cabelo e barba' },
    { id: 'barboterapia', name: 'Barboterapia', price: 60, min: 30, extra: true, kind: 'barba', group: 'Cabelo e barba' },
    { id: 'corte-barba', name: 'Cabelo + Barba Simples', price: 90, min: 60, bundle: ['corte', 'barba'], group: 'Cabelo e barba' },
    { id: 'corte-barboterapia', name: 'Cabelo + Barboterapia', price: 120, min: 60, bundle: ['corte', 'barboterapia'], group: 'Cabelo e barba' },
    { id: 'maquina', name: 'Máquina', price: 40, min: 15, group: 'Cabelo e barba' },
    { id: 'sobrancelha', name: 'Sobrancelha', price: 10, min: 15, extra: true, group: 'Cuidados' },
    { id: 'limpeza', name: 'Limpeza de Pele', price: 120, min: 30, extra: true, group: 'Cuidados' },
    { id: 'cera-nariz', name: 'Cera Nariz', price: 30, min: 15, extra: true, kind: 'nariz', group: 'Cuidados' },
    { id: 'cera-orelha', name: 'Cera Orelha', price: 30, min: 15, extra: true, kind: 'orelha', group: 'Cuidados' },
    { id: 'cera-nariz-orelha', name: 'Cera Nariz + Orelha', price: 45, min: 15, bundle: ['cera-nariz', 'cera-orelha'], group: 'Cuidados' },
    { id: 'ass-corte', name: 'Corte Assinatura', plan: true, min: 15, group: 'Assinantes' },
    { id: 'ass-barba', name: 'Barba Assinatura', plan: true, min: 15, group: 'Assinantes' },
    { id: 'ass-corte-barba', name: 'Cabelo + Barba Assinatura', plan: true, min: 30, group: 'Assinantes' }
  ]
});
