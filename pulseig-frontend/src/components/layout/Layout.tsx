import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store';
import styles from './Layout.module.css';

const NAV = [
  { path: '/inbox',     label: 'Bandeja' },
  { path: '/contacts',  label: 'Contactos' },
  { path: '/products',  label: 'Stock' },
  { path: '/triggers',  label: 'Triggers' },
  { path: '/dashboard', label: 'Dashboard' },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { business, logout } = useAuthStore();
  const isActive = (path: string) => location.pathname === path;

  return (
    <div className={styles.app}>
      <header className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <div className={styles.logo}>P</div>
          <span className={styles.logoName}>PulseIG</span>
          <div className={styles.divider} />
          <div className={styles.bizChip}>
            <span className={styles.bizDot} />
            <span className={styles.bizName}>{business?.name || 'Mi Negocio'}</span>
          </div>
        </div>
        <nav className={styles.topNav}>
          {NAV.map(item => (
            <button key={item.path} className={`${styles.navBtn} ${isActive(item.path) ? styles.navBtnActive : ''}`} onClick={() => navigate(item.path)}>
              {item.label}
            </button>
          ))}
        </nav>
        <div className={styles.topbarRight}>
          <button className={styles.iconBtn} onClick={() => navigate('/settings')} title="Configuración">⚙️</button>
          <div className={styles.userAvatar} onClick={logout} title="Cerrar sesión">
            {business?.name?.slice(0,2).toUpperCase() || 'TN'}
          </div>
        </div>
      </header>

      <div className={styles.body}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarSection}>
            <div className={styles.sectionLabel}>Conversaciones</div>
            <button className={`${styles.sideLink} ${isActive('/inbox') ? styles.sideLinkActive : ''}`} onClick={() => navigate('/inbox')}>
              <span className={styles.sideLinkIcon}>💬</span><span className={styles.sideLinkText}>Todas</span>
            </button>
            <button className={styles.sideLink} onClick={() => navigate('/inbox?seg=hot')}>
              <span className={styles.sideLinkIcon}>🔥</span><span className={styles.sideLinkText}>Calientes</span>
            </button>
            <button className={styles.sideLink} onClick={() => navigate('/inbox?ai=1')}>
              <span className={styles.sideLinkIcon}>🤖</span><span className={styles.sideLinkText}>Gestionadas por IA</span>
            </button>
          </div>
          <div className={styles.sectionDivider} />
          <div className={styles.sidebarSection}>
            <div className={styles.sectionLabel}>Campañas</div>
            <button className={`${styles.sideLink} ${isActive('/reengagement') ? styles.sideLinkActive : ''}`} onClick={() => navigate('/reengagement')}>
              <span className={styles.sideLinkIcon}>🔄</span><span className={styles.sideLinkText}>Re-engagement</span>
            </button>
            <button className={styles.sideLink}>
              <span className={styles.sideLinkIcon}>🛒</span><span className={styles.sideLinkText}>Carritos</span>
            </button>
            <button className={styles.sideLink}>
              <span className={styles.sideLinkIcon}>⭐</span><span className={styles.sideLinkText}>Post-venta</span>
            </button>
          </div>
          <div className={styles.sectionDivider} />
          <div className={styles.sidebarSection}>
            <div className={styles.sectionLabel}>Sistema</div>
            <button className={`${styles.sideLink} ${isActive('/products') ? styles.sideLinkActive : ''}`} onClick={() => navigate('/products')}>
              <span className={styles.sideLinkIcon}>📦</span><span className={styles.sideLinkText}>Stock</span>
            </button>
            <button className={`${styles.sideLink} ${isActive('/triggers') ? styles.sideLinkActive : ''}`} onClick={() => navigate('/triggers')}>
              <span className={styles.sideLinkIcon}>⚡</span><span className={styles.sideLinkText}>Triggers</span>
            </button>
            <button className={`${styles.sideLink} ${isActive('/dashboard') ? styles.sideLinkActive : ''}`} onClick={() => navigate('/dashboard')}>
              <span className={styles.sideLinkIcon}>📊</span><span className={styles.sideLinkText}>ROI Dashboard</span>
            </button>
            <button className={`${styles.sideLink} ${isActive('/contacts') ? styles.sideLinkActive : ''}`} onClick={() => navigate('/contacts')}>
              <span className={styles.sideLinkIcon}>👥</span><span className={styles.sideLinkText}>Contactos</span>
            </button>
          </div>
          <div className={styles.sidebarBottom}>
            <button className={`${styles.sideLink} ${isActive('/settings') ? styles.sideLinkActive : ''}`} onClick={() => navigate('/settings')}>
              <span className={styles.sideLinkIcon}>⚙️</span><span className={styles.sideLinkText}>Configuración</span>
            </button>
          </div>
        </aside>
        <main className={styles.main}><Outlet /></main>
      </div>
    </div>
  );
}
