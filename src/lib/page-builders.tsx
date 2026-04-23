import Link from "next/link";
import type { ReactNode } from "react";

type Breadcrumb = {
  href?: string;
  label: string;
};

type Panel = {
  title: string;
  body: string;
};

type RouteLink = {
  href: string;
  label: string;
};

export function AppShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand-lockup">
          <Link className="brand" href="/">
            Engmatch
          </Link>
          <p className="brand-tag">IELTS Architect Notebook</p>
        </div>
        <nav className="topnav" aria-label="Primary">
          <Link href="/listening">Listening</Link>
          <Link href="/reading">Reading</Link>
          <Link href="/speaking">Speaking</Link>
          <Link href="/writing">Writing</Link>
          <Link href="/notebook">Notebook</Link>
          <Link href="/notifications">Notifications</Link>
          <Link href="/admin">Teacher/Admin</Link>
        </nav>
      </header>
      <main className="content">
        {children}
      </main>
    </div>
  );
}

export function PlaceholderPage({
  title,
  description,
  breadcrumbs,
  panels,
  links,
}: {
  title: string;
  description: string;
  breadcrumbs: Breadcrumb[];
  panels: Panel[];
  links: RouteLink[];
}) {
  return (
    <section className="stack-lg">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        {breadcrumbs.map((crumb, index) => (
          <span key={`${crumb.label}-${index}`}>
            {crumb.href ? <Link href={crumb.href}>{crumb.label}</Link> : crumb.label}
            {index < breadcrumbs.length - 1 ? " / " : ""}
          </span>
        ))}
      </nav>

      <div className="section-header">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>

      <div className="panel-grid">
        {panels.map((panel) => (
          <article className="panel" key={panel.title}>
            <h3>{panel.title}</h3>
            <p>{panel.body}</p>
          </article>
        ))}
      </div>

      <div className="route-grid">
        {links.map((link) => (
          <Link className="route-card" href={link.href} key={link.href}>
            <span>{link.label}</span>
            <strong>Open</strong>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function SectionLayout({
  section,
  children,
}: {
  section: string;
  children: ReactNode;
}) {
  return (
    <div className="stack-md">
      <div className="section-banner">
        <span>{section}</span>
        <p>Choose a section to continue your IELTS practice.</p>
      </div>
      {children}
    </div>
  );
}

export function MetricList({
  items,
}: {
  items: { id: string; label: string; value: string }[];
}) {
  return (
    <div className="metric-grid">
      {items.map((item) => (
        <article className="metric-card" key={item.id}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </article>
      ))}
    </div>
  );
}
