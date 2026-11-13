import React, { useEffect, useState } from 'react';
import { GameProvider } from './context/GameContext';
import { ProjectorDisplay } from './pages/ProjectorDisplay';
import { AdminControl } from './pages/AdminControl';
import { TeamController } from './pages/TeamController';
import { PortalHome } from './pages/PortalHome';

function resolveRoute(): 'DISPLAY' | 'ADMIN' | 'PLAY' | 'HOME' {
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.replace(/^#/, '').split('?')[0].toLowerCase();
  const activePath = hash || path;

  if (activePath.startsWith('/display') || activePath.startsWith('/projector')) {
    return 'DISPLAY';
  }
  if (activePath.startsWith('/admin') || activePath.startsWith('/host')) {
    return 'ADMIN';
  }
  if (activePath.startsWith('/play') || activePath.startsWith('/controller')) {
    return 'PLAY';
  }
  return 'HOME';
}

export const App: React.FC = () => {
  const [route, setRoute] = useState<'DISPLAY' | 'ADMIN' | 'PLAY' | 'HOME'>(resolveRoute);

  useEffect(() => {
    const onPopState = () => setRoute(resolveRoute());
    window.addEventListener('popstate', onPopState);
    window.addEventListener('hashchange', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('hashchange', onPopState);
    };
  }, []);

  return (
    <GameProvider>
      {route === 'DISPLAY' && <ProjectorDisplay />}
      {route === 'ADMIN' && <AdminControl />}
      {route === 'PLAY' && <TeamController />}
      {route === 'HOME' && <PortalHome />}
    </GameProvider>
  );
};

export default App;
