import sys
path = 'd:/PROJECTS/CAKE SAAs1/frontend_v2/app/admin/messages/page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update imports
text = text.replace(
    "import { sendAdminMessage } from '@/lib/api/admin';",
    "import { sendAdminMessage, getAdminBroadcastHistory } from '@/lib/api/admin';"
)

# 2. Delete INITIAL_BROADCASTS
text = text.replace(
    'const INITIAL_BROADCASTS: SentBroadcastRecord[] = [];\n',
    ''
)

# 3. Update hooks & handleSend
old_logic = """  useEffect(() => {
    try {
      const saved = localStorage.getItem('cakestore_admin_broadcasts');
      if (saved) {
        setBroadcasts(JSON.parse(saved));
      } else {
        setBroadcasts(INITIAL_BROADCASTS);
      }
    } catch {
      setBroadcasts(INITIAL_BROADCASTS);
    }
  }, []);

  const saveBroadcasts = (newRecords: SentBroadcastRecord[]) => {
    setBroadcasts(newRecords);
    try {
      localStorage.setItem('cakestore_admin_broadcasts', JSON.stringify(newRecords));
    } catch {
      // Ignore quota error
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !message.trim()) {
      toast.error('Please complete both the title and message fields');
      return;
    }

    if (targetType === 'SPECIFIC' && !specificOwnerId) {
      toast.error('Please specify a valid Owner User ID');
      return;
    }

    setIsSending(true);
    try {
      const response = await sendAdminMessage({
        title,
        message,
        specificOwnerId: targetType === 'SPECIFIC' ? Number(specificOwnerId) : null,
        sendEmail,
      });

      const newRecord: SentBroadcastRecord = {
        id: `bcast-${Date.now()}`,
        title,
        message,
        target: targetType === 'SPECIFIC' ? `Owner User #${specificOwnerId}` : 'All Bakery Owners',
        sentAt: new Date().toISOString(),
        recipientCount: targetType === 'SPECIFIC' ? 1 : 18,
      };

      saveBroadcasts([newRecord, ...broadcasts]);
      toast.success(response || 'Broadcast sent successfully');

      // Reset form
      setTitle('');
      setMessage('');
      setSpecificOwnerId('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to dispatch broadcast');
    } finally {
      setIsSending(false);
    }
  };"""

new_logic = """  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const data = await getAdminBroadcastHistory();
      setBroadcasts(data || []);
    } catch (err) {
      console.error('Failed to load broadcast history', err);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !message.trim()) {
      toast.error('Please complete both the title and message fields');
      return;
    }

    if (targetType === 'SPECIFIC' && !specificOwnerId) {
      toast.error('Please specify a valid Owner User ID');
      return;
    }

    setIsSending(true);
    try {
      const response = await sendAdminMessage({
        title,
        message,
        specificOwnerId: targetType === 'SPECIFIC' ? Number(specificOwnerId) : null,
        sendEmail,
      });

      toast.success(response || 'Broadcast dispatched successfully. Processing in background.');

      // Reset form
      setTitle('');
      setMessage('');
      setSpecificOwnerId('');
      fetchHistory();
    } catch (err: any) {
      toast.error(err.message || 'Failed to dispatch broadcast');
    } finally {
      setIsSending(false);
    }
  };"""

text = text.replace(old_logic, new_logic)

# 4. Update target rendering
text = text.replace(
    '<span className="font-medium text-slate-600">{bcast.target}</span>',
    '<span className="font-medium text-slate-600">{bcast.targetType === \'SPECIFIC\' ? `Owner User #${bcast.targetOwnerId}` : \'All Bakery Owners\'}</span>'
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)
