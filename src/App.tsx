import { useCallback, useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Download,
  Ellipsis,
  Filter,
  Globe2,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  MonitorSmartphone,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Smartphone,
  Sparkles,
  Users,
  Video,
  X,
  CircleAlert,
  Pencil,
  Trash2,
  FileText,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Account, Client, Device, Platform, Post, Section, Status, Store } from './types';
import type { AppProfile } from './lib/auth';
import { appSection, getAppProfile, signOut } from './lib/auth';
import AuthScreen from './components/AuthScreen';
import ClientProvisionModal from './components/ClientProvisionModal';
import {
  emptyRemoteStore,
  fetchRemoteStore,
  requestProtectedDelete,
  saveRemotePost,
  saveRemoteRecord,
  supabase,
  supabaseConfigured,
} from './lib/supabase';
import './App.css';

const now = new Date();
const formatDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const dateOffset = (days: number) => {
  const date = new Date(now);
  date.setDate(date.getDate() - days);
  return formatDateKey(date);
};
const today = formatDateKey(now);
const currentTime = now.toTimeString().slice(0, 5);
const todayLabel = new Intl.DateTimeFormat('en', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
}).format(now);
const nextId = (prefix: string, rows: { id: string }[]) => {
  if (supabaseConfigured) return `${prefix}-${crypto.randomUUID()}`;
  const next =
    rows.reduce((max, row) => Math.max(max, Number(row.id.split('-').at(-1)) || 0), 0) + 1;
  return `${prefix}-${String(next).padStart(3, '0')}`;
};
const platformSeeds: Platform[] = [
  {
    id: 'PLT-001',
    name: 'Instagram',
    active: true,
    color: '#d94e8f',
    dailyTarget: 15,
    notes: 'Meta',
  },
  {
    id: 'PLT-002',
    name: 'TikTok',
    active: true,
    color: '#1d222a',
    dailyTarget: 10,
    notes: 'Short form video',
  },
  {
    id: 'PLT-003',
    name: 'Facebook',
    active: true,
    color: '#4d79df',
    dailyTarget: 7,
    notes: 'Meta',
  },
  {
    id: 'PLT-004',
    name: 'YouTube',
    active: true,
    color: '#ea5555',
    dailyTarget: 3,
    notes: 'Video channel',
  },
  {
    id: 'PLT-005',
    name: 'X',
    active: false,
    color: '#69727f',
    dailyTarget: 0,
    notes: 'Not currently used',
  },
];
const clientsSeed: Client[] = [
  {
    id: 'CLI-001',
    name: 'Studio North',
    contact: 'hello@studionorth.co',
    dailyTarget: 12,
    status: 'Active',
    remarks: 'Lifestyle & wellness',
  },
  {
    id: 'CLI-002',
    name: 'Morrow Goods',
    contact: 'team@morrowgoods.co',
    dailyTarget: 8,
    status: 'Active',
    remarks: 'DTC brand',
  },
  {
    id: 'CLI-003',
    name: 'Fieldwork Coffee',
    contact: 'ops@fieldwork.coffee',
    dailyTarget: 10,
    status: 'Active',
    remarks: 'Hospitality',
  },
  {
    id: 'CLI-004',
    name: 'Sunday Supply',
    contact: 'social@sundaysupply.co',
    dailyTarget: 5,
    status: 'Active',
    remarks: 'Seasonal campaigns',
  },
];
const devicesSeed: Device[] = [
  {
    id: 'DEV-001',
    name: 'Phone 01',
    type: 'Android',
    assignedTo: 'Jordan Lee',
    status: 'Active',
    remarks: 'Primary device',
  },
  {
    id: 'DEV-002',
    name: 'Phone 02',
    type: 'iPhone',
    assignedTo: 'Alex Morgan',
    status: 'Active',
    remarks: 'Studio desk',
  },
  {
    id: 'DEV-003',
    name: 'Phone 03',
    type: 'Android',
    assignedTo: 'Jordan Lee',
    status: 'Maintenance',
    remarks: 'Screen replacement',
  },
];
function makeSeedStore(): Store {
  const accounts: Account[] = [];
  let accountNum = 1;
  clientsSeed.forEach((client, ci) =>
    platformSeeds.slice(0, 4).forEach((platform, pi) => {
      accounts.push({
        id: `ACC-${String(accountNum++).padStart(3, '0')}`,
        clientId: client.id,
        platformId: platform.id,
        name:
          platform.name === 'Facebook'
            ? `${client.name} Page`
            : `@${client.name.toLowerCase().replaceAll(' ', '')}${pi ? `_${platform.name.toLowerCase().slice(0, 2)}` : ''}`,
        deviceId: devicesSeed[(ci + pi) % devicesSeed.length].id,
        phone: `+1 (555) 01${String(accountNum).padStart(2, '0')}`,
        email: `social+${client.id.slice(-3)}@studio.co`,
        status: 'Active',
        dailyTarget: pi === 0 ? 4 : 2,
        remarks: pi === 0 ? 'Primary account' : '',
      });
    })
  );
  const clientBuckets = [
    ...Array(12).fill(clientsSeed[0]),
    ...Array(6).fill(clientsSeed[1]),
    ...Array(6).fill(clientsSeed[2]),
    ...Array(3).fill(clientsSeed[3]),
  ] as Client[];
  const platformBuckets = [
    ...Array(11).fill(platformSeeds[0]),
    ...Array(9).fill(platformSeeds[1]),
    ...Array(6).fill(platformSeeds[2]),
    ...Array(1).fill(platformSeeds[3]),
  ] as Platform[];
  const posts: Post[] = clientBuckets.map((client, i) => {
    const platform = platformBuckets[i];
    const account = accounts.find((a) => a.clientId === client.id && a.platformId === platform.id)!;
    const date = today;
    const status: Status = 'Published';
    return {
      id: `POST-${String(i + 1).padStart(3, '0')}`,
      date,
      time: `${String(8 + (Math.floor(i / 2) % 11)).padStart(2, '0')}:${String((i * 7) % 60).padStart(2, '0')}`,
      clientId: client.id,
      accountId: account.id,
      platformId: platform.id,
      deviceId: account.deviceId,
      contentId: `VID-${String(i + 1).padStart(3, '0')}`,
      contentType: 'Video',
      status,
      operator: i % 2 ? 'Alex Morgan' : 'Jordan Lee',
      url: '',
      remark: '',
    };
  });
  [4, 16].forEach((index, i) => {
    const client = clientsSeed[index === 4 ? 1 : 2];
    const platform = platformSeeds[index === 4 ? 1 : 2];
    const account = accounts.find((a) => a.clientId === client.id && a.platformId === platform.id)!;
    posts.push({
      id: `POST-${String(28 + i).padStart(3, '0')}`,
      date: today,
      time: i ? '13:32' : '13:41',
      clientId: client.id,
      accountId: account.id,
      platformId: platform.id,
      deviceId: account.deviceId,
      contentId: `VID-${String(28 + i).padStart(3, '0')}`,
      contentType: 'Video',
      status: 'Failed',
      operator: i ? 'Alex Morgan' : 'Jordan Lee',
      url: '',
      remark: 'Connection timed out',
    });
  });
  clientBuckets.slice(0, 7).forEach((client, i) => {
    const platform = platformBuckets[i];
    const account = accounts.find((a) => a.clientId === client.id && a.platformId === platform.id)!;
    posts.push({
      id: `POST-${String(30 + i).padStart(3, '0')}`,
      date: dateOffset((i % 6) + 1),
      time: `${String(10 + i).padStart(2, '0')}:15`,
      clientId: client.id,
      accountId: account.id,
      platformId: platform.id,
      deviceId: account.deviceId,
      contentId: `VID-${String(30 + i).padStart(3, '0')}`,
      contentType: 'Video',
      status: 'Published',
      operator: i % 2 ? 'Alex Morgan' : 'Jordan Lee',
      url: '',
      remark: '',
    });
  });
  return { clients: clientsSeed, platforms: platformSeeds, devices: devicesSeed, accounts, posts };
}
const STORAGE_KEY = 'social-ops-control-center-v1';
const navItems: { name: Section; icon: typeof LayoutDashboard; group: string }[] = [
  { name: 'Dashboard', icon: LayoutDashboard, group: 'WORKSPACE' },
  { name: 'Posting log', icon: Video, group: 'WORKSPACE' },
  { name: 'Accounts', icon: Smartphone, group: 'MANAGE' },
  { name: 'Clients', icon: Users, group: 'MANAGE' },
  { name: 'Platforms', icon: Globe2, group: 'MANAGE' },
  { name: 'Devices', icon: MonitorSmartphone, group: 'MANAGE' },
  { name: 'History', icon: FileText, group: 'INSIGHTS' },
  { name: 'Reports', icon: BarChart3, group: 'INSIGHTS' },
];
const statusClass = (status: string) => status.toLowerCase();

function App() {
  const [store, setStore] = useState<Store>(() => emptyRemoteStore());
  const [sessionReady, setSessionReady] = useState(!supabaseConfigured);
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [section, setSection] = useState<Section>('Dashboard');
  const [modal, setModal] = useState<'post' | 'record' | null>(null);
  const [provisionOpen, setProvisionOpen] = useState(false);
  const [editItem, setEditItem] = useState<{ type: string; value: any } | null>(null);
  const [deleteRequest, setDeleteRequest] = useState<{
    table: 'posts' | 'clients' | 'accounts' | 'platforms' | 'devices';
    id: string;
    label: string;
  } | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [notice, setNotice] = useState('');
  const [dataStatus, setDataStatus] = useState<'local' | 'connecting' | 'connected' | 'error'>(
    supabaseConfigured ? 'connecting' : 'local'
  );
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All statuses');
  const [dateFilter, setDateFilter] = useState(today);
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    const client = supabase;
    if (!supabaseConfigured || !client) return;
    let active = true;
    const applySession = async (
      nextSession: Awaited<ReturnType<typeof client.auth.getSession>>['data']['session']
    ) => {
      if (!active) return;
      if (!nextSession) {
        setProfile(null);
        setStore(emptyRemoteStore());
        localStorage.removeItem(STORAGE_KEY);
        setSessionReady(true);
        return;
      }
      setSessionReady(false);
      try {
        const nextProfile = await getAppProfile(nextSession.user.id);
        if (!active) return;
        setProfile(nextProfile);
        setSection(appSection(nextProfile.role));
        setSessionReady(true);
      } catch (error) {
        await client.auth.signOut();
        if (!active) return;
        setProfile(null);
        setSessionReady(true);
        setNotice(
          `Account setup is incomplete: ${error instanceof Error ? error.message : 'profile unavailable'}`
        );
      }
    };
    client.auth.getSession().then((result) => applySession(result.data.session));
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      queueMicrotask(() => {
        void applySession(nextSession);
      });
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const refreshStore = useCallback(async () => {
    if (!supabaseConfigured || !profile) return;
    try {
      const remote = await fetchRemoteStore();
      setStore(remote);
      setDataStatus('connected');
    } catch (error) {
      setDataStatus('error');
      setNotice(
        `Could not sync Supabase data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    const initialRefresh = window.setTimeout(() => {
      void refreshStore();
    }, 0);
    const refreshTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refreshStore();
    }, 20000);
    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(refreshTimer);
    };
  }, [profile, refreshStore]);

  const persist = async (next: Store) => {
    setStore(next);
    setDataStatus('connected');
    setNotice('Changes saved.');
  };
  const clientName = (id: string) =>
    store.clients.find((x) => x.id === id)?.name ?? 'Unknown client';
  const platformName = (id: string) =>
    store.platforms.find((x) => x.id === id)?.name ?? 'Unknown platform';
  const accountName = (id: string) =>
    store.accounts.find((x) => x.id === id)?.name ?? 'Unknown account';
  const deviceName = (id: string) => store.devices.find((x) => x.id === id)?.name ?? '—';
  const todayPosts = store.posts.filter((post) => post.date === today);
  const publishedToday = todayPosts.filter((post) => post.status === 'Published').length;
  const failedToday = todayPosts.filter((post) => post.status === 'Failed').length;
  const target = store.clients
    .filter((c) => c.status === 'Active')
    .reduce((sum, client) => sum + Number(client.dailyTarget || 0), 0);
  const remaining = Math.max(target - publishedToday, 0);
  const clientActivity = store.clients
    .map((client) => {
      const count = todayPosts.filter(
        (post) => post.clientId === client.id && post.status === 'Published'
      ).length;
      return { ...client, count, remaining: Math.max(client.dailyTarget - count, 0) };
    })
    .sort((a, b) => b.count - a.count);
  const platformActivity = store.platforms
    .filter((p) => p.active)
    .map((platform) => {
      const count = todayPosts.filter(
        (post) => post.platformId === platform.id && post.status === 'Published'
      ).length;
      const platformTarget = platform.dailyTarget;
      return {
        ...platform,
        count,
        target: platformTarget,
        remaining: Math.max(platformTarget - count, 0),
      };
    });
  const recentPosts = [...store.posts]
    .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`))
    .slice(0, 5);
  const filteredPosts = store.posts.filter((post) => {
    const row = [
      post.id,
      post.contentId,
      post.operator,
      clientName(post.clientId),
      accountName(post.accountId),
      platformName(post.platformId),
    ]
      .join(' ')
      .toLowerCase();
    return (
      row.includes(search.toLowerCase()) &&
      (statusFilter === 'All statuses' || post.status === statusFilter) &&
      (dateFilter === 'all' || post.date === dateFilter)
    );
  });

  const savePost = async (value: Post) => {
    const exists = store.posts.some((p) => p.id === value.id);
    try {
      const post =
        profile?.role === 'client'
          ? {
              ...value,
              clientId: profile.clientId ?? '',
              deviceId:
                store.accounts.find((account) => account.id === value.accountId)?.deviceId ?? '',
            }
          : value;
      await saveRemotePost(post);
      const posts = exists
        ? store.posts.map((current) => (current.id === post.id ? post : current))
        : [post, ...store.posts];
      const next = { ...store, posts };
      setStore(next);
      setNotice('Posting record saved.');
      setModal(null);
      setEditItem(null);
    } catch (error) {
      setNotice(`Could not save post: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  const deletePost = (id: string) => {
    const post = store.posts.find((row) => row.id === id);
    setDeleteError('');
    setDeleteRequest({ table: 'posts', id, label: post?.contentId || id });
  };
  const saveRecord = async (type: string, value: any) => {
    const key = type.toLowerCase() as 'clients' | 'accounts' | 'platforms' | 'devices';
    const rows = store[key] as any[];
    try {
      await saveRemoteRecord(key, value);
      const updatedRows = rows.some((r) => r.id === value.id)
        ? rows.map((r) => (r.id === value.id ? value : r))
        : [...rows, value];
      const next = { ...store, [key]: updatedRows };
      setStore(next);
      setNotice('Changes saved.');
      setModal(null);
      setEditItem(null);
    } catch (error) {
      setNotice(
        `Could not save ${type.toLowerCase().slice(0, -1)}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };
  const deleteRecord = (type: string, id: string) => {
    const table = type.toLowerCase() as 'clients' | 'accounts' | 'platforms' | 'devices';
    const row = (store[table] as any[]).find((item) => item.id === id);
    setDeleteError('');
    setDeleteRequest({ table, id, label: row?.name || id });
  };
  const confirmProtectedDelete = async () => {
    if (!deleteRequest || !deletePassword) return;
    if (profile?.role !== 'admin') {
      setDeleteError('Only an admin can delete records.');
      return;
    }
    setDeleteBusy(true);
    try {
      await requestProtectedDelete(deleteRequest.table, deleteRequest.id, deletePassword);
      const next = {
        ...store,
        [deleteRequest.table]: (store[deleteRequest.table] as any[]).filter(
          (row) => row.id !== deleteRequest.id
        ),
      } as Store;
      setStore(next);
      setDeleteRequest(null);
      setDeletePassword('');
      setNotice('Record deleted.');
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setDeleteBusy(false);
    }
  };
  const openPost = (post?: Post) => {
    setEditItem(post ? { type: 'post', value: post } : null);
    setModal('post');
  };
  const openRecord = (type: string, value?: any) => {
    setEditItem(value ? { type, value } : null);
    setModal('record');
  };
  const exportPosts = () => {
    const headings = [
      'Post ID',
      'Date',
      'Time',
      'Client',
      'Account',
      'Platform',
      'Device',
      'Content ID',
      'Type',
      'Status',
      'Operator',
      'URL',
      'Remark',
    ];
    const csv = [
      headings,
      ...filteredPosts.map((p) => [
        p.id,
        p.date,
        p.time,
        clientName(p.clientId),
        accountName(p.accountId),
        platformName(p.platformId),
        deviceName(p.deviceId),
        p.contentId,
        p.contentType,
        p.status,
        p.operator,
        p.url,
        p.remark,
      ]),
    ]
      .map((r) => r.map((v) => `"${String(v ?? '').replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    link.download = 'social-ops-posting-log.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };
  const handleAuthenticated = () => {
    if (!supabase) return;
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      try {
        const nextProfile = await getAppProfile(data.session.user.id);
        setProfile(nextProfile);
        setSection(appSection(nextProfile.role));
        setSessionReady(true);
      } catch (error) {
        setNotice(
          `Could not load your account: ${error instanceof Error ? error.message : 'unknown error'}`
        );
      }
    });
  };

  if (!sessionReady) {
    return (
      <main className="auth-loading">
        <div className="brand-mark">
          <Activity size={19} />
        </div>
        <span>Verifying workspace access…</span>
      </main>
    );
  }
  if (!profile) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }
  const isAdmin = profile.role === 'admin';

  const screenTitle = section === 'Dashboard' ? 'Good morning, team' : section;
  const postTable = (posts: Post[], showDate = true) => (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {showDate && <th>DATE & TIME</th>}
            <th>CLIENT</th>
            <th>PLATFORM / ACCOUNT</th>
            <th>CONTENT</th>
            <th>STATUS</th>
            <th>OPERATOR</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {posts.map((post) => (
            <tr key={post.id}>
              {showDate && (
                <td>
                  <strong>
                    {new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(
                      new Date(`${post.date}T12:00:00`)
                    )}
                  </strong>
                  <small>{post.time}</small>
                </td>
              )}
              <td>
                <span className="client-cell">
                  <i className={`avatar avatar-${post.clientId.slice(-1)}`}>
                    {clientName(post.clientId).slice(0, 1)}
                  </i>
                  <span>
                    <strong>{clientName(post.clientId)}</strong>
                    <small>{post.id}</small>
                  </span>
                </span>
              </td>
              <td>
                <span className="platform-label">
                  <i
                    className={`platform-dot dot-${platformName(post.platformId).toLowerCase()}`}
                  />
                  {platformName(post.platformId)}
                </span>
                <small className="subline">{accountName(post.accountId)}</small>
              </td>
              <td>
                <strong>{post.contentId || '—'}</strong>
                <small>{post.contentType}</small>
              </td>
              <td>
                <span className={`status-pill ${statusClass(post.status)}`}>
                  <i />
                  {post.status}
                </span>
              </td>
              <td>{post.operator || '—'}</td>
              <td>
                <div className="row-actions">
                  <button
                    className="icon-button row-action"
                    onClick={() => openPost(post)}
                    aria-label="Edit post"
                  >
                    <Pencil size={15} />
                  </button>
                  {isAdmin && (
                    <button
                      className="icon-button row-action danger-button"
                      onClick={() => deletePost(post.id)}
                      aria-label="Delete post"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {posts.length === 0 && (
        <div className="empty-state">
          <Video size={28} />
          <strong>No posting records found</strong>
          <span>Adjust your filters or log your first post.</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">
            <Activity size={19} strokeWidth={2.5} />
          </div>
          <span>
            social<span className="brand-light">ops</span>
            <small>CONTROL CENTER</small>
          </span>
          <button className="mobile-close icon-button" onClick={() => setMobileNav(false)}>
            <X size={18} />
          </button>
        </div>
        <div className="workspace-switch">
          <div className="workspace-logo">S</div>
          <div>
            <strong>Social Studio</strong>
            <small>Agency workspace</small>
          </div>
          <ChevronDown size={15} />
        </div>
        <nav>
          {['WORKSPACE', 'MANAGE', 'INSIGHTS'].map(
            (group) =>
              navItems.some(
                (item) => item.group === group && (isAdmin || item.name === 'Posting log')
              ) && (
                <div className="nav-group" key={group}>
                  <div className="nav-caption">{group}</div>
                  {navItems
                    .filter(
                      (item) => item.group === group && (isAdmin || item.name === 'Posting log')
                    )
                    .map(({ name, icon: Icon }) => (
                      <button
                        key={name}
                        className={`nav-link ${section === name ? 'active' : ''}`}
                        onClick={() => {
                          setSection(name);
                          setMobileNav(false);
                        }}
                      >
                        <Icon size={17} strokeWidth={1.9} />
                        <span>{name}</span>
                        {name === 'Posting log' && <i className="nav-count">{todayPosts.length}</i>}
                      </button>
                    ))}
                </div>
              )
          )}
        </nav>
        <div className="sidebar-bottom">
          {isAdmin && (
            <div className="plan-card">
              <div className="plan-icon">
                <Sparkles size={15} />
              </div>
              <strong>Keep the momentum</strong>
              <p>
                Your team has published <b>{publishedToday} posts</b> today.
              </p>
              <button onClick={() => setSection('Reports')}>
                View performance <ArrowUpRight size={14} />
              </button>
            </div>
          )}
          {isAdmin && (
            <button
              className={`nav-link settings-link ${section === 'Settings' ? 'active' : ''}`}
              onClick={() => setSection('Settings')}
            >
              <Settings size={17} />
              <span>Settings</span>
            </button>
          )}
          <div className="profile">
            <div className="profile-avatar">{profile.username.slice(0, 2).toUpperCase()}</div>
            <div>
              <strong>{profile.username}</strong>
              <small>{isAdmin ? 'Workspace admin' : clientName(profile.clientId ?? '')}</small>
            </div>
            <button
              className="icon-button"
              onClick={() => {
                void signOut();
              }}
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      {mobileNav && (
        <button
          className="nav-scrim"
          onClick={() => setMobileNav(false)}
          aria-label="Close navigation"
        />
      )}
      <main className="main-area">
        <header className="topbar">
          <button
            className="mobile-menu icon-button"
            onClick={() => setMobileNav(true)}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <div className="breadcrumbs">
            <span>Social Studio</span>
            <ChevronRight size={14} />
            <strong>{section}</strong>
          </div>
          <div className="top-actions">
            <div
              className={`live-status ${dataStatus}`}
              title={
                dataStatus === 'local'
                  ? 'Browser-only preview; configure Supabase to share data.'
                  : undefined
              }
            >
              <i />{' '}
              {dataStatus === 'connecting'
                ? 'Connecting to Supabase'
                : dataStatus === 'connected'
                  ? `${isAdmin ? 'Admin' : 'Client'} · Supabase`
                  : dataStatus === 'error'
                    ? 'Database connection issue'
                    : 'Local preview'}
            </div>
            <button className="icon-button notification-button" aria-label="Notifications">
              <Bell size={18} />
              <i />
            </button>
            <div className="top-avatar">JL</div>
          </div>
        </header>
        {notice && (
          <div
            className={`app-notice ${notice.startsWith('Could not') || notice.startsWith('Delete was') ? 'notice-error' : ''}`}
            role="status"
          >
            <span>{notice}</span>
            <button
              className="icon-button"
              aria-label="Dismiss notice"
              onClick={() => setNotice('')}
            >
              <X size={15} />
            </button>
          </div>
        )}
        <div className="page-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {section === 'Dashboard' ? todayLabel.toUpperCase() : 'SOCIAL STUDIO / OPERATIONS'}
              </div>
              <h1>
                {screenTitle}
                {section === 'Dashboard' && <span className="wave">✦</span>}
              </h1>
              <p>
                {!isAdmin
                  ? `Manage posting activity for ${clientName(profile.clientId ?? '')}.`
                  : section === 'Dashboard'
                    ? 'Here’s what’s happening across your accounts today.'
                    : section === 'Posting log' || section === 'History'
                      ? 'Every post, one reliable source of truth.'
                      : `Manage your ${section.toLowerCase()} and keep your operation running smoothly.`}
              </p>
            </div>
            <div className="heading-actions">
              {isAdmin && section === 'Clients' && (
                <button className="button button-secondary" onClick={() => setProvisionOpen(true)}>
                  <KeyRound size={15} /> Create client login
                </button>
              )}
              {section === 'Dashboard' && (
                <button className="button button-secondary export-button" onClick={exportPosts}>
                  <Download size={16} /> Export
                </button>
              )}
              <button className="button button-primary" onClick={() => openPost()}>
                <Plus size={17} /> Add post
              </button>
            </div>
          </div>

          {isAdmin && section === 'Dashboard' && (
            <DashboardView
              target={target}
              published={publishedToday}
              failed={failedToday}
              remaining={remaining}
              clientActivity={clientActivity}
              platformActivity={platformActivity}
              recentPosts={recentPosts}
              posts={store.posts}
              onViewAll={() => setSection('History')}
              onAdd={() => openPost()}
              todayLabel={todayLabel}
            />
          )}
          {(isAdmin
            ? section === 'Posting log' || section === 'History'
            : section === 'Posting log') && (
            <section className="panel records-panel">
              <div className="panel-header">
                <div>
                  <h2>{section === 'History' ? 'Post history' : 'All posting activity'}</h2>
                  <p>
                    Showing {filteredPosts.length} of {store.posts.length} records
                  </p>
                </div>
                <button className="button button-secondary" onClick={exportPosts}>
                  <Download size={15} /> Export CSV
                </button>
              </div>
              <div className="filters-row">
                <label className="search-field">
                  <Search size={16} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search posts, clients, accounts..."
                  />
                </label>
                <label className="select-filter">
                  <CalendarDays size={15} />
                  <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
                    <option value="all">All dates</option>
                    <option value={today}>Today</option>
                  </select>
                  <ChevronDown size={14} />
                </label>
                <label className="select-filter">
                  <Filter size={15} />
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    {[
                      'All statuses',
                      'Published',
                      'Failed',
                      'Pending',
                      'Scheduled',
                      'Cancelled',
                    ].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} />
                </label>
              </div>
              {postTable(filteredPosts)}
            </section>
          )}
          {isAdmin && ['Accounts', 'Clients', 'Platforms', 'Devices'].includes(section) && (
            <EntityView
              section={section}
              store={store}
              clientName={clientName}
              platformName={platformName}
              deviceName={deviceName}
              onAdd={() => openRecord(section)}
              onEdit={(row: any) => openRecord(section, row)}
              onDelete={(id: string) => deleteRecord(section, id)}
            />
          )}
          {isAdmin && section === 'Reports' && (
            <ReportsView
              posts={store.posts}
              clients={store.clients}
              platforms={store.platforms}
              clientName={clientName}
              platformName={platformName}
            />
          )}
          {isAdmin && section === 'Settings' && (
            <SettingsView
              store={store}
              remote={supabaseConfigured}
              onReset={() => {
                if (supabaseConfigured) {
                  setNotice('Sample data reset is disabled for a connected Supabase workspace.');
                  return;
                }
                if (
                  window.confirm(
                    'Restore the sample workspace? This will replace current local data.'
                  )
                ) {
                  const fresh = makeSeedStore();
                  persist(fresh);
                }
              }}
            />
          )}
        </div>
      </main>
      {modal === 'post' && (
        <PostModal
          store={store}
          clientProfile={profile.role === 'client' ? profile : undefined}
          initial={editItem?.type === 'post' ? editItem.value : undefined}
          onClose={() => {
            setModal(null);
            setEditItem(null);
          }}
          onSave={savePost}
        />
      )}
      {modal === 'record' && editItem && editItem.type !== section && (
        <RecordModal
          section={editItem.type}
          store={store}
          initial={editItem.value}
          onClose={() => {
            setModal(null);
            setEditItem(null);
          }}
          onSave={saveRecord}
        />
      )}
      {modal === 'record' && (!editItem || editItem.type === section) && (
        <RecordModal
          section={section}
          store={store}
          initial={editItem?.value}
          onClose={() => {
            setModal(null);
            setEditItem(null);
          }}
          onSave={saveRecord}
        />
      )}
      {modal === 'post' && <></>}
      {isAdmin && provisionOpen && (
        <ClientProvisionModal
          onClose={() => setProvisionOpen(false)}
          onCreated={() => {
            void refreshStore();
          }}
        />
      )}
      {deleteRequest && (
        <DeleteModal
          target={deleteRequest}
          password={deletePassword}
          busy={deleteBusy}
          error={deleteError}
          enabled={supabaseConfigured && dataStatus === 'connected'}
          onPassword={(value) => {
            setDeletePassword(value);
            setDeleteError('');
          }}
          onCancel={() => {
            setDeleteRequest(null);
            setDeletePassword('');
            setDeleteError('');
          }}
          onConfirm={confirmProtectedDelete}
        />
      )}
    </div>
  );
}

function DashboardView({
  target,
  published,
  failed,
  remaining,
  clientActivity,
  platformActivity,
  recentPosts,
  posts,
  onViewAll,
  onAdd,
  todayLabel,
}: any) {
  const weekly = Array.from({ length: 7 }, (_, i) => {
    const date = dateOffset(6 - i);
    return {
      day: new Intl.DateTimeFormat('en', { weekday: 'short' }).format(new Date(`${date}T12:00:00`)),
      count: posts.filter((post: Post) => post.date === date && post.status === 'Published').length,
    };
  });
  const weeklyTotal = weekly.reduce((total, day) => total + day.count, 0);
  const maxClient = Math.max(...clientActivity.map((x: any) => x.dailyTarget), 1);
  return (
    <>
      <div className="dashboard-meta">
        <div className="date-chip">
          <CalendarDays size={15} />
          {todayLabel}
        </div>
        <div className="meta-right">
          <span className="updated-dot" /> Updated just now{' '}
          <button className="icon-button" aria-label="More dashboard options">
            <Ellipsis size={18} />
          </button>
        </div>
      </div>
      <section className="stats-grid">
        <article className="stat-card stat-primary">
          <div className="stat-top">
            <span>Published today</span>
            <span className="stat-icon">
              <Video size={17} />
            </span>
          </div>
          <div className="stat-number">
            {published}
            <span>/{target}</span>
          </div>
          <div className="stat-bottom">
            <span className="stat-trend">
              <ArrowUpRight size={14} /> {target ? Math.round((published / target) * 100) : 0}% of
              daily target
            </span>
            <div className="progress-track">
              <i style={{ width: `${target ? Math.min((published / target) * 100, 100) : 0}%` }} />
            </div>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-top">
            <span>Daily target</span>
            <span className="stat-icon icon-lilac">
              <Sparkles size={17} />
            </span>
          </div>
          <div className="stat-number">
            {target}
            <small>posts</small>
          </div>
          <div className="stat-bottom muted">
            <span>Across {clientActivity.length} active clients</span>
            <span className="trend-good">
              <ArrowUpRight size={13} /> 8.4%
            </span>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-top">
            <span>Remaining</span>
            <span className="stat-icon icon-amber">
              <Clock3 size={17} />
            </span>
          </div>
          <div className="stat-number">
            {remaining}
            <small>to goal</small>
          </div>
          <div className="stat-bottom muted">
            <span>
              {remaining === 0 ? 'Daily goal reached 🎉' : 'You’re making great progress'}
            </span>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-top">
            <span>Needs attention</span>
            <span className="stat-icon icon-rose">
              <CircleAlert size={17} />
            </span>
          </div>
          <div className="stat-number">
            {failed}
            <small>failed</small>
          </div>
          <div className="stat-bottom muted">
            <span>{failed ? 'Review failed posts' : 'Nothing to review'}</span>
            <span className={failed ? 'attention-link' : 'trend-good'}>
              {failed ? 'View' : <Check size={14} />}
            </span>
          </div>
        </article>
      </section>
      <div className="dashboard-grid">
        <section className="panel weekly-panel">
          <div className="panel-header">
            <div>
              <h2>Posting activity</h2>
              <p>Your team’s publishing pace this week</p>
            </div>
            <button className="period-button">
              This week <ChevronDown size={14} />
            </button>
          </div>
          <div className="chart-key">
            <span>
              <i /> Published posts
            </span>
            <span className="chart-total">
              {weeklyTotal} <small>this week</small>
            </span>
          </div>
          <div className="activity-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weekly} margin={{ top: 12, right: 8, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4c69df" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#4c69df" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#edf0f5" vertical={false} />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9aa2b2', fontSize: 11 }}
                  dy={10}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#a0a7b5', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, borderColor: '#e8ebf2', fontSize: 12 }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#536fe4"
                  strokeWidth={2.5}
                  fill="url(#activityFill)"
                  activeDot={{ r: 4, fill: '#536fe4' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-footer">
            <span>
              <i className="chart-positive">
                <Check size={12} />
              </i>
              <small>Calculated from published posting records</small>
            </span>
            <button onClick={onViewAll}>
              View history <ArrowUpRight size={14} />
            </button>
          </div>
        </section>
        <section className="panel clients-panel">
          <div className="panel-header">
            <div>
              <h2>Today by client</h2>
              <p>Publishing progress toward goals</p>
            </div>
            <button className="icon-button" onClick={onViewAll} aria-label="View clients">
              <MoreHorizontal size={19} />
            </button>
          </div>
          <div className="client-progress-list">
            {clientActivity.slice(0, 5).map((client: any, i: number) => (
              <div className="client-progress" key={client.id}>
                <i className={`avatar avatar-${client.id.slice(-1)}`}>{client.name.slice(0, 1)}</i>
                <div className="client-progress-main">
                  <div className="client-progress-line">
                    <strong>{client.name}</strong>
                    <span>
                      {client.count}
                      <small> / {client.dailyTarget}</small>
                    </span>
                  </div>
                  <div className="mini-progress">
                    <i
                      className={`fill-${i + 1}`}
                      style={{ width: `${Math.min((client.count / maxClient) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button className="text-link" onClick={onViewAll}>
            See all activity <ArrowUpRight size={14} />
          </button>
        </section>
      </div>
      <div className="dashboard-grid bottom-grid">
        <section className="panel platform-panel">
          <div className="panel-header">
            <div>
              <h2>Platforms</h2>
              <p>Daily publishing volume by channel</p>
            </div>
            <button className="button button-quiet" onClick={onAdd}>
              <Plus size={15} /> Log post
            </button>
          </div>
          <div className="platform-table">
            <div className="platform-table-head">
              <span>PLATFORM</span>
              <span>POSTED</span>
              <span>TARGET</span>
              <span>REMAINING</span>
            </div>
            {platformActivity.map((platform: any) => (
              <div className="platform-table-row" key={platform.id}>
                <span className="platform-label">
                  <i className={`platform-dot dot-${platform.name.toLowerCase()}`} />
                  {platform.name}
                </span>
                <strong>{platform.count}</strong>
                <span>{platform.target}</span>
                <span className={platform.remaining === 0 ? 'complete-value' : ''}>
                  {platform.remaining === 0 ? <Check size={14} /> : platform.remaining}
                </span>
              </div>
            ))}
          </div>
          <button className="text-link" onClick={onViewAll}>
            View all platform activity <ArrowUpRight size={14} />
          </button>
        </section>
        <section className="panel recent-panel">
          <div className="panel-header">
            <div>
              <h2>Recent posts</h2>
              <p>Your latest posting activity</p>
            </div>
            <button className="text-link" onClick={onViewAll}>
              View all <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="recent-list">
            {recentPosts.slice(0, 4).map((post: Post) => (
              <div className="recent-item" key={post.id}>
                <div className="recent-time">{post.time}</div>
                <div className={`recent-status-icon ${statusClass(post.status)}`}>
                  {post.status === 'Published' ? (
                    <CheckCircle2 size={15} />
                  ) : post.status === 'Failed' ? (
                    <CircleAlert size={15} />
                  ) : (
                    <Clock3 size={15} />
                  )}
                </div>
                <div className="recent-content">
                  <strong>{post.contentId}</strong>
                  <span>
                    {post.operator} · {post.accountId}
                  </span>
                </div>
                <span className={`status-pill compact ${statusClass(post.status)}`}>
                  <i />
                  {post.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function EntityView({
  section,
  store,
  clientName,
  platformName,
  deviceName,
  onAdd,
  onEdit,
  onDelete,
}: any) {
  const accounts = section === 'Accounts';
  const clients = section === 'Clients';
  const platforms = section === 'Platforms';
  const rows =
    section === 'Accounts'
      ? store.accounts
      : section === 'Clients'
        ? store.clients
        : section === 'Platforms'
          ? store.platforms
          : store.devices;
  const [query, setQuery] = useState('');
  const visible = rows.filter((row: any) =>
    JSON.stringify(row).toLowerCase().includes(query.toLowerCase())
  );
  const countLabel =
    section === 'Accounts'
      ? 'managed accounts'
      : section === 'Clients'
        ? 'active clients'
        : section === 'Platforms'
          ? 'available channels'
          : 'registered devices';
  return (
    <section className="panel records-panel">
      <div className="panel-header">
        <div>
          <h2>{section} directory</h2>
          <p>
            {rows.length} {countLabel}
          </p>
        </div>
        <button className="button button-primary" onClick={onAdd}>
          <Plus size={16} /> Add {section.slice(0, -1).toLowerCase()}
        </button>
      </div>
      <div className="filters-row">
        <label className="search-field">
          <Search size={16} />
          <input
            placeholder={`Search ${section.toLowerCase()}...`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {accounts ? (
                <>
                  <th>ACCOUNT</th>
                  <th>CLIENT</th>
                  <th>PLATFORM</th>
                  <th>DEVICE</th>
                  <th>DAILY TARGET</th>
                  <th>STATUS</th>
                </>
              ) : clients ? (
                <>
                  <th>CLIENT</th>
                  <th>CONTACT</th>
                  <th>ACCOUNTS</th>
                  <th>DAILY TARGET</th>
                  <th>STATUS</th>
                </>
              ) : platforms ? (
                <>
                  <th>PLATFORM</th>
                  <th>ACCOUNTS</th>
                  <th>DAILY TARGET</th>
                  <th>STATUS</th>
                  <th>NOTES</th>
                </>
              ) : (
                <>
                  <th>DEVICE</th>
                  <th>TYPE</th>
                  <th>ASSIGNED TO</th>
                  <th>ACCOUNTS</th>
                  <th>STATUS</th>
                  <th>REMARKS</th>
                </>
              )}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row: any) => (
              <tr key={row.id}>
                {accounts ? (
                  <>
                    <td>
                      <strong>{row.name}</strong>
                      <small>
                        {row.id} · {row.email}
                      </small>
                    </td>
                    <td>{clientName(row.clientId)}</td>
                    <td>
                      <span className="platform-label">
                        <i
                          className={`platform-dot dot-${platformName(row.platformId).toLowerCase()}`}
                        />
                        {platformName(row.platformId)}
                      </span>
                    </td>
                    <td>{deviceName(row.deviceId)}</td>
                    <td>{row.dailyTarget} / day</td>
                    <td>
                      <span className={`status-pill ${statusClass(row.status)}`}>
                        <i />
                        {row.status}
                      </span>
                    </td>
                  </>
                ) : clients ? (
                  <>
                    <td>
                      <span className="client-cell">
                        <i className={`avatar avatar-${row.id.slice(-1)}`}>
                          {row.name.slice(0, 1)}
                        </i>
                        <span>
                          <strong>{row.name}</strong>
                          <small>{row.id}</small>
                        </span>
                      </span>
                    </td>
                    <td>{row.contact || '—'}</td>
                    <td>{store.accounts.filter((a: Account) => a.clientId === row.id).length}</td>
                    <td>
                      <strong>{row.dailyTarget}</strong> posts / day
                    </td>
                    <td>
                      <span className={`status-pill ${statusClass(row.status)}`}>
                        <i />
                        {row.status}
                      </span>
                    </td>
                  </>
                ) : platforms ? (
                  <>
                    <td>
                      <span className="platform-label">
                        <i className={`platform-dot dot-${row.name.toLowerCase()}`} />
                        {row.name}
                      </span>
                      <small>{row.id}</small>
                    </td>
                    <td>{store.accounts.filter((a: Account) => a.platformId === row.id).length}</td>
                    <td>{row.dailyTarget} posts / day</td>
                    <td>
                      <span className={`status-pill ${row.active ? 'published' : 'cancelled'}`}>
                        <i />
                        {row.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{row.notes || '—'}</td>
                  </>
                ) : (
                  <>
                    <td>
                      <strong>{row.name}</strong>
                      <small>{row.id}</small>
                    </td>
                    <td>{row.type}</td>
                    <td>{row.assignedTo || '—'}</td>
                    <td>{store.accounts.filter((a: Account) => a.deviceId === row.id).length}</td>
                    <td>
                      <span
                        className={`status-pill ${row.status.toLowerCase() === 'active' ? 'published' : 'failed'}`}
                      >
                        <i />
                        {row.status}
                      </span>
                    </td>
                    <td>{row.remarks || '—'}</td>
                  </>
                )}
                <td>
                  <div className="row-actions">
                    <button
                      className="icon-button"
                      onClick={() => onEdit(row)}
                      aria-label="Edit record"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="icon-button danger-button"
                      onClick={() => onDelete(row.id)}
                      aria-label="Delete record"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && (
          <div className="empty-state">
            <Search size={26} />
            <strong>Nothing here yet</strong>
            <span>Try a different search or add a record.</span>
          </div>
        )}
      </div>
    </section>
  );
}

function PostModal({
  store,
  initial,
  clientProfile,
  onClose,
  onSave,
}: {
  store: Store;
  initial?: Post;
  clientProfile?: AppProfile;
  onClose: () => void;
  onSave: (post: Post) => void;
}) {
  const defaultClientId = clientProfile?.clientId ?? store.clients[0]?.id ?? '';
  const defaultAccount = store.accounts.find((account) => account.clientId === defaultClientId);
  const [form, setForm] = useState<Post>(
    initial ?? {
      id: nextId('POST', store.posts),
      date: today,
      time: currentTime,
      clientId: defaultClientId,
      accountId: defaultAccount?.id ?? '',
      platformId: defaultAccount?.platformId ?? '',
      deviceId: defaultAccount?.deviceId ?? '',
      contentId: '',
      contentType: 'Video',
      status: 'Published',
      operator: 'Jordan Lee',
      url: '',
      remark: '',
    }
  );
  const accounts = store.accounts.filter((a) => a.clientId === form.clientId);
  const selectedAccount = store.accounts.find((a) => a.id === form.accountId);
  const set = (key: keyof Post, value: string) =>
    setForm((old) => {
      const next = { ...old, [key]: value };
      if (key === 'clientId') {
        const account = store.accounts.find((a) => a.clientId === value);
        next.accountId = account?.id ?? '';
        next.platformId = account?.platformId ?? '';
        next.deviceId = account?.deviceId ?? '';
      }
      if (key === 'accountId') {
        const account = store.accounts.find((a) => a.id === value);
        if (account) {
          next.platformId = account.platformId;
          next.deviceId = account.deviceId;
        }
      }
      return next;
    });
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form
        className="modal post-modal"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(form);
        }}
      >
        <div className="modal-heading">
          <div>
            <div className="modal-icon">
              <Video size={18} />
            </div>
            <h2>{initial ? 'Edit posting record' : 'Log a post'}</h2>
            <p>Record a new publishing activity.</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            <X size={19} />
          </button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <Field label="Date">
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
              />
            </Field>
            <Field label="Time">
              <input
                type="time"
                required
                value={form.time}
                onChange={(e) => set('time', e.target.value)}
              />
            </Field>
            <Field label="Client">
              {clientProfile ? (
                <input
                  readOnly
                  value={
                    store.clients.find((client) => client.id === clientProfile.clientId)?.name ?? ''
                  }
                />
              ) : (
                <select
                  required
                  value={form.clientId}
                  onChange={(e) => set('clientId', e.target.value)}
                >
                  {store.clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Account">
              <select
                required
                value={form.accountId}
                onChange={(e) => set('accountId', e.target.value)}
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Platform">
              <select
                disabled
                value={selectedAccount?.platformId ?? form.platformId}
                onChange={(e) => set('platformId', e.target.value)}
              >
                {store.platforms.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Device">
              <select
                disabled={Boolean(clientProfile)}
                value={selectedAccount?.deviceId ?? form.deviceId}
                onChange={(e) => set('deviceId', e.target.value)}
              >
                <option value="">No device</option>
                {store.devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Content ID">
              <input
                placeholder="VID-028"
                value={form.contentId}
                onChange={(e) => set('contentId', e.target.value)}
              />
            </Field>
            <Field label="Content type">
              <select value={form.contentType} onChange={(e) => set('contentType', e.target.value)}>
                {['Video', 'Reel', 'Short', 'Story', 'Image', 'Carousel', 'Text'].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={(e) => set('status', e.target.value as Status)}>
                {['Published', 'Failed', 'Pending', 'Scheduled', 'Cancelled'].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </Field>
            <Field label="Operator">
              <input value={form.operator} onChange={(e) => set('operator', e.target.value)} />
            </Field>
            <Field label="Post URL" wide>
              <input
                type="url"
                placeholder="https://..."
                value={form.url}
                onChange={(e) => set('url', e.target.value)}
              />
            </Field>
            <Field label="Remark" wide>
              <textarea
                rows={2}
                placeholder="Add a note about this post..."
                value={form.remark}
                onChange={(e) => set('remark', e.target.value)}
              />
            </Field>
          </div>
        </div>
        <div className="modal-footer">
          <span>
            <i className="secure-dot" /> Saved to this browser
          </span>
          <div>
            <button type="button" className="button button-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="button button-primary">
              <Check size={16} /> Save post
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
function Field({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <label className={`form-field ${wide ? 'field-wide' : ''}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function DeleteModal({
  target,
  password,
  busy,
  error,
  enabled,
  onPassword,
  onCancel,
  onConfirm,
}: {
  target: { table: string; id: string; label: string };
  password: string;
  busy: boolean;
  error: string;
  enabled: boolean;
  onPassword: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onCancel()}
    >
      <form
        className="modal delete-modal"
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm();
        }}
      >
        <div className="modal-heading">
          <div>
            <div className="modal-icon delete-icon">
              <Trash2 size={18} />
            </div>
            <h2>Protected delete</h2>
            <p>Deleting “{target.label}” cannot be undone.</p>
          </div>
          <button type="button" className="icon-button" onClick={onCancel} aria-label="Close">
            <X size={19} />
          </button>
        </div>
        <div className="modal-body">
          {enabled ? (
            <Field label="Owner delete password">
              <input
                autoFocus
                required
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => onPassword(event.target.value)}
                placeholder="Enter the private delete password"
              />
            </Field>
          ) : (
            <div className="delete-setup-note">
              <CircleHelp size={17} />
              <span>
                Protected deletes are locked until Supabase and the server-side delete function are
                configured. There is no client-side fallback password.
              </span>
            </div>
          )}
          {error && (
            <p className="delete-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="modal-footer">
          <span>
            {target.table} · {target.id}
          </span>
          <div>
            <button type="button" className="button button-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button
              type="submit"
              className="button button-danger"
              disabled={!enabled || !password || busy}
            >
              <Trash2 size={15} /> {busy ? 'Deleting…' : 'Delete record'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function RecordModal({
  section,
  store,
  initial,
  onClose,
  onSave,
}: {
  section: string;
  store: Store;
  initial?: any;
  onClose: () => void;
  onSave: (type: string, value: any) => void;
}) {
  const kind = section.slice(0, -1);
  const idPrefix =
    section === 'Clients'
      ? 'CLI'
      : section === 'Accounts'
        ? 'ACC'
        : section === 'Platforms'
          ? 'PLT'
          : 'DEV';
  const id =
    initial?.id ??
    nextId(
      idPrefix,
      store[section.toLowerCase() as 'clients' | 'accounts' | 'platforms' | 'devices']
    );
  const [form, setForm] = useState<any>(
    initial ??
      (section === 'Clients'
        ? { id, name: '', contact: '', dailyTarget: 5, status: 'Active', remarks: '' }
        : section === 'Platforms'
          ? { id, name: '', active: true, color: '#536fe4', dailyTarget: 0, notes: '' }
          : section === 'Devices'
            ? { id, name: '', type: 'Android', assignedTo: '', status: 'Active', remarks: '' }
            : {
                id,
                clientId: store.clients[0]?.id ?? '',
                platformId: store.platforms[0]?.id ?? '',
                name: '',
                deviceId: store.devices[0]?.id ?? '',
                phone: '',
                email: '',
                status: 'Active',
                dailyTarget: 2,
                remarks: '',
              })
  );
  const set = (key: string, value: any) => setForm((old: any) => ({ ...old, [key]: value }));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSave(section, form);
  };
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal record-modal" onSubmit={submit}>
        <div className="modal-heading">
          <div>
            <div className="modal-icon">
              <Users size={18} />
            </div>
            <h2>{initial ? `Edit ${kind}` : `Add ${kind}`}</h2>
            <p>Keep your workspace directory up to date.</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            <X size={19} />
          </button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            {section === 'Clients' && (
              <>
                <Field label="Client name">
                  <input
                    required
                    autoFocus
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    placeholder="e.g. Acme Studio"
                  />
                </Field>
                <Field label="Daily video target">
                  <input
                    required
                    type="number"
                    min="0"
                    value={form.dailyTarget}
                    onChange={(e) => set('dailyTarget', Number(e.target.value))}
                  />
                </Field>
                <Field label="Contact email">
                  <input
                    type="email"
                    value={form.contact}
                    onChange={(e) => set('contact', e.target.value)}
                    placeholder="team@brand.com"
                  />
                </Field>
                <Field label="Status">
                  <select value={form.status} onChange={(e) => set('status', e.target.value)}>
                    <option>Active</option>
                    <option>Paused</option>
                  </select>
                </Field>
                <Field label="Remarks" wide>
                  <textarea
                    rows={2}
                    value={form.remarks}
                    onChange={(e) => set('remarks', e.target.value)}
                  />
                </Field>
              </>
            )}
            {section === 'Accounts' && (
              <>
                <Field label="Account name">
                  <input
                    required
                    autoFocus
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    placeholder="@brand_account"
                  />
                </Field>
                <Field label="Client">
                  <select value={form.clientId} onChange={(e) => set('clientId', e.target.value)}>
                    {store.clients.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Platform">
                  <select
                    value={form.platformId}
                    onChange={(e) => set('platformId', e.target.value)}
                  >
                    {store.platforms.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Device">
                  <select value={form.deviceId} onChange={(e) => set('deviceId', e.target.value)}>
                    <option value="">Unassigned</option>
                    {store.devices.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Daily target">
                  <input
                    type="number"
                    min="0"
                    value={form.dailyTarget}
                    onChange={(e) => set('dailyTarget', Number(e.target.value))}
                  />
                </Field>
                <Field label="Status">
                  <select value={form.status} onChange={(e) => set('status', e.target.value)}>
                    <option>Active</option>
                    <option>Paused</option>
                  </select>
                </Field>
                <Field label="Phone">
                  <input value={form.phone} onChange={(e) => set('phone', e.target.value)} />
                </Field>
                <Field label="Email">
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                  />
                </Field>
                <Field label="Remarks" wide>
                  <textarea
                    rows={2}
                    value={form.remarks}
                    onChange={(e) => set('remarks', e.target.value)}
                  />
                </Field>
                <div className="credential-note field-wide">
                  <CircleHelp size={16} />
                  <span>For safety, passwords are not stored in this browser workspace.</span>
                </div>
              </>
            )}
            {section === 'Platforms' && (
              <>
                <Field label="Platform name">
                  <input
                    required
                    autoFocus
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    placeholder="e.g. Threads"
                  />
                </Field>
                <Field label="Daily post target">
                  <input
                    required
                    type="number"
                    min="0"
                    value={form.dailyTarget ?? 0}
                    onChange={(e) => set('dailyTarget', Number(e.target.value))}
                  />
                </Field>
                <Field label="Status">
                  <select
                    value={String(form.active)}
                    onChange={(e) => set('active', e.target.value === 'true')}
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </Field>
                <Field label="Notes" wide>
                  <textarea
                    rows={2}
                    value={form.notes}
                    onChange={(e) => set('notes', e.target.value)}
                  />
                </Field>
              </>
            )}
            {section === 'Devices' && (
              <>
                <Field label="Device name">
                  <input
                    required
                    autoFocus
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    placeholder="Phone 04"
                  />
                </Field>
                <Field label="Device type">
                  <select value={form.type} onChange={(e) => set('type', e.target.value)}>
                    <option>Android</option>
                    <option>iPhone</option>
                    <option>Tablet</option>
                    <option>Desktop</option>
                    <option>Other</option>
                  </select>
                </Field>
                <Field label="Assigned to">
                  <input
                    value={form.assignedTo}
                    onChange={(e) => set('assignedTo', e.target.value)}
                  />
                </Field>
                <Field label="Status">
                  <select value={form.status} onChange={(e) => set('status', e.target.value)}>
                    <option>Active</option>
                    <option>Maintenance</option>
                    <option>Retired</option>
                  </select>
                </Field>
                <Field label="Remarks" wide>
                  <textarea
                    rows={2}
                    value={form.remarks}
                    onChange={(e) => set('remarks', e.target.value)}
                  />
                </Field>
              </>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <span>{form.id}</span>
          <div>
            <button type="button" className="button button-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="button button-primary">
              <Check size={16} /> Save {kind}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function ReportsView({ posts, clients, platforms }: any) {
  const published = posts.filter((p: Post) => p.status === 'Published').length;
  const failed = posts.filter((p: Post) => p.status === 'Failed').length;
  const data = Array.from({ length: 7 }, (_, i) => {
    const date = dateOffset(6 - i);
    return {
      day: new Intl.DateTimeFormat('en', { weekday: 'short' }).format(new Date(`${date}T12:00:00`)),
      count: posts.filter((p: Post) => p.date === date && p.status === 'Published').length,
    };
  });
  return (
    <>
      <div className="report-kpis">
        <div className="report-kpi">
          <span>Total posts</span>
          <strong>{posts.length}</strong>
          <small>All time records</small>
        </div>
        <div className="report-kpi">
          <span>Published</span>
          <strong>{published}</strong>
          <small>Successful posts</small>
        </div>
        <div className="report-kpi">
          <span>Failed</span>
          <strong>{failed}</strong>
          <small>Need a retry</small>
        </div>
        <div className="report-kpi">
          <span>Success rate</span>
          <strong>
            {posts.length ? `${((published / posts.length) * 100).toFixed(1)}%` : '0%'}
          </strong>
          <small>Published / total</small>
        </div>
      </div>
      <div className="dashboard-grid">
        <section className="panel weekly-panel">
          <div className="panel-header">
            <div>
              <h2>Publishing trends</h2>
              <p>Published posts over the last 7 days</p>
            </div>
            <span className="date-chip">
              <CalendarDays size={14} /> Last 7 days
            </span>
          </div>
          <div className="report-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 14, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="reportFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4c69df" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#4c69df" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#edf0f5" vertical={false} />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9aa2b2', fontSize: 11 }}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#a0a7b5', fontSize: 10 }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#536fe4"
                  strokeWidth={2.5}
                  fill="url(#reportFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="panel clients-panel">
          <div className="panel-header">
            <div>
              <h2>By client</h2>
              <p>Published posts by client</p>
            </div>
          </div>
          <div className="report-ranking">
            {clients.map((c: Client) => (
              <div key={c.id}>
                <span>{c.name}</span>
                <strong>
                  {
                    posts.filter((p: Post) => p.clientId === c.id && p.status === 'Published')
                      .length
                  }
                </strong>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="panel report-platforms">
        <div className="panel-header">
          <div>
            <h2>Channel performance</h2>
            <p>Breakdown of all posting activity</p>
          </div>
        </div>
        <div className="platform-table">
          <div className="platform-table-head">
            <span>PLATFORM</span>
            <span>PUBLISHED</span>
            <span>FAILED</span>
            <span>TOTAL</span>
          </div>
          {platforms.map((p: Platform) => {
            const matches = posts.filter((post: Post) => post.platformId === p.id);
            return (
              <div className="platform-table-row" key={p.id}>
                <span className="platform-label">
                  <i className={`platform-dot dot-${p.name.toLowerCase()}`} />
                  {p.name}
                </span>
                <strong>{matches.filter((x: Post) => x.status === 'Published').length}</strong>
                <span>{matches.filter((x: Post) => x.status === 'Failed').length}</span>
                <span>{matches.length}</span>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
function SettingsView({ store, remote, onReset }: any) {
  return (
    <div className="settings-layout">
      <section className="panel settings-panel">
        <div className="panel-header">
          <div>
            <h2>Workspace settings</h2>
            <p>Preferences for your local Social Ops workspace</p>
          </div>
        </div>
        <div className="setting-row">
          <div>
            <strong>Data storage</strong>
            <p>
              {remote
                ? 'Your shared workspace is read from and written to Supabase.'
                : 'Preview data is stored in this browser using localStorage until Supabase is configured.'}
            </p>
          </div>
          <span className={`status-pill ${remote ? 'published' : 'pending'}`}>
            <i />
            {remote ? 'Supabase database' : 'On this device'}
          </span>
        </div>
        <div className="setting-row">
          <div>
            <strong>Credential safety</strong>
            <p>Passwords are intentionally excluded from the account directory.</p>
          </div>
          <span className="status-pill published">
            <i />
            Protected
          </span>
        </div>
        <div className="setting-row">
          <div>
            <strong>Workspace records</strong>
            <p>
              {store.clients.length} clients · {store.accounts.length} accounts ·{' '}
              {store.posts.length} posting records
            </p>
          </div>
          <button className="button button-secondary" disabled={remote} onClick={onReset}>
            {remote ? 'Sample data disabled' : 'Restore sample data'}
          </button>
        </div>
      </section>
      <div className="settings-note">
        <Sparkles size={17} />
        <div>
          <strong>Built for your team’s workflow</strong>
          <p>
            Post counts are automatically calculated from the posting log. Keep account information
            and publishing activity in their own places.
          </p>
        </div>
      </div>
    </div>
  );
}
export default App;
