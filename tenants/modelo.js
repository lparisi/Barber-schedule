// Marca neutra de demonstração: prova que o mesmo app serve a qualquer salão.
(window.TENANTS = window.TENANTS || []).push({
  id: 'modelo',
  name: 'Barbearia Modelo',
  city: 'Centro',
  address: 'Rua das Flores, 100 · Centro',
  phone: '(11) 90000-0000',
  accent: { light: '#3F3CC8', dark: '#9C9AFF' },
  grid: 15,
  pin: '1234',
  hours: {
    1: [['09:00', '12:00'], ['13:00', '19:00']],
    2: [['09:00', '12:00'], ['13:00', '19:00']],
    3: [['09:00', '12:00'], ['13:00', '19:00']],
    4: [['09:00', '12:00'], ['13:00', '19:00']],
    5: [['09:00', '12:00'], ['13:00', '20:00']],
    6: [['09:00', '17:00']]
  },
  pros: [
    { id: 'p1', name: 'André Lima', role: 'Barbeiro', services: null, off: [] },
    { id: 'p2', name: 'Bruno Reis', role: 'Barbeiro', services: null, off: [1] },
    { id: 'p3', name: 'Diego Faria', role: 'Barbeiro', services: ['corte', 'barba', 'corte-barba', 'maquina'], off: [3] }
  ],
  services: [
    { id: 'corte', name: 'Corte', price: 55, min: 30, group: 'Cabelo e barba' },
    { id: 'barba', name: 'Barba', price: 40, min: 30, group: 'Cabelo e barba' },
    { id: 'corte-barba', name: 'Corte + Barba', price: 85, min: 60, group: 'Cabelo e barba' },
    { id: 'maquina', name: 'Corte na máquina', price: 35, min: 15, group: 'Cabelo e barba' },
    { id: 'sobrancelha', name: 'Sobrancelha', price: 15, min: 15, group: 'Cuidados' },
    { id: 'hidratacao', name: 'Hidratação', price: 50, min: 30, group: 'Cuidados' }
  ]
});
