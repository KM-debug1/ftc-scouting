describe('Starter client', () => {
  it('loads the home page', () => {
    cy.visit('/');
    cy.contains('Auth-ready starter shell').should('be.visible');
  });
});
