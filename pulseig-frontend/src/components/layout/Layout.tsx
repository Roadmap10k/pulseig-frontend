import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store';
import styles from './Layout.module.css';

const NAV = [
  { path: '/inbox',     label: 'Bandeja',    icon: '💬', badge: null },
  { path: '/contacts',  label: 'Contactos',  icon: '👥', badge: null },
  { path: '/products',  label: 'Stock',      icon: '📦', badge: null },
  { path: '/triggers',  label: 'Triggers',   icon: '⚡', badge: null },
  { path: '/dashboard', label: 'Dashboard',  icon: '📊', badge: null },
];

const SIDEBAR_SECTIONS = [
  {
    label: 'Conversaciones',
    links: [
      { path: '/inbox', icon: '💬', label: 'Todas', badge: '12', badgeType: 'red' },
      { path: '/inbox?seg=hot', icon: '🔥', label: 'Calientes', badge: '5', badgeType: 'red' },
      { path: '/inbox?ai=1', icon: '🤖', label: 'Gestionadas por IA', badge: '28', badgeType: 'gray' },
      { path: '/inbox?status=waiting', icon: '⏳', label: 'Sin responder', badge: '3', badgeType: 'red' },
    ],
  },
  {
    label: 'Campañas',
    links: [
      { path: '/contacts?campaign=reengagement', icon: '🔄', label: 'Re-engagement', badge: null, badgeType: '' },
      { path: '/inbox?campaign=cart', icon: '🛒', label: 'Carritos', badge: '4', badgeType: 'red' },
      { path: '/contacts?campaign=postventa', icon: '⭐', label: 'Post-venta', badge: null, badgeType: '' },
    ],
  },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { business, logout } = useAuthStore();

  const isActive = (path: string) => location.pathname === path.split('?')[0];

  return (
    <div className={styles.app}>
      {/* TOPBAR */}
      <header className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <div className={styles.logo}>P</div>
          <span className={styles.logoName}>PulseIG</span>
          <div className={styles.divider} />
          <div className={styles.bizChip}>
            <span className={styles.bizDot} />
            <span className={styles.bizName}>{business?.name || 'Mi Negocio'}</span>
            <span className={styles.bizCaret}>▾</span>
          </div>
        </div>

        <nav className={styles.topNav}>
          {NAV.map(item => (
            <button
              key={item.path}
              className={`${styles.navBtn} ${isActive(item.path) ? styles.navBtnActive : ''}`}
              onClick={() => navigate(item.path)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className={styles.topbarRight}>
          <button className={styles.periodBtn}>Abril 2026 ▾</button>
          <button className={styles.iconBtn} title="Notificaciones">
            🔔
            <span className={styles.notifPip} />
          </button>
          <div
            className={styles.userAvatar}
            onClick={logout}
            title="Cerrar sesión"
          >
            {business?.name?.slice(0, 2).toUpperCase() || 'TN'}
          </div>
        </div>
      </header>

      <div className={styles.body}>
        {/* SIDEBAR */}
        <aside className={styles.sidebar}>
          {SIDEBAR_SECTIONS.map(section => (
            <div key={section.label} className={styles.sidebarSection}>
              <div className={styles.sectionLabel}>{section.label}</div>
              {section.links.map(link => (
                <button
                  key={link.path}
                  className={`${styles.sideLink} ${isActive(link.path) ? styles.sideLinkActive : ''}`}
                  onClick={() => navigate(link.path)}
                >
                  <span className={styles.sideLinkIcon}>{link.icon}</span>
                  <span className={styles.sideLinkText}>{link.label}</span>
                  {link.badge && (
                    <span className={`${styles.sideBadge} ${link.badgeType === 'red' ? styles.badgeRed : styles.badgeGray}`}>
                      {link.badge}
                    </span>
                  )}
                </button>
              ))}
              <div className={styles.sectionDivider} />
            </div>
          ))}
          <div className={styles.sidebarSection}>
            <div className={styles.sectionLabel}>Sistema</div>
            <button className={styles.sideLink} onClick={() => navigate('/products')}>
              <span className={styles.sideLinkIcon}>📦</span>
              <span className={styles.sideLinkText}>Stock</span>
            </button>
            <button className={styles.sideLink} onClick={() => navigate('/triggers')}>
              <span className={styles.sideLinkIcon}>⚡</span>
              <span className={styles.sideLinkText}>Triggers</span>
            </button>
            <button className={styles.sideLink} onClick={() => navigate('/dashboard')}>
              <span className={styles.sideLinkIcon}>📊</span>
              <span className={styles.sideLinkText}>ROI Dashboard</span>
            </button>
          </div>
          <div className={styles.sidebarBottom}>
            <button className={styles.sideLink}>
              <span className={styles.sideLinkIcon}>⚙️</span>
              <span className={styles.sideLinkText}>Configuración</span>
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
