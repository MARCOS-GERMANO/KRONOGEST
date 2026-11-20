import React, { createContext, useContext } from 'react';
export const ProfileCtx = createContext({ papel: 'leitura', podeEscrever: false, podeAprovar: false });
export const useProfile = () => useContext(ProfileCtx);
export const montarPerfil = (p) => ({
  ...p,
  podeEscrever: !!p && p.papel !== 'leitura',
  podeAprovar: !!p && ['admin', 'engenheiro'].includes(p.papel),
});
