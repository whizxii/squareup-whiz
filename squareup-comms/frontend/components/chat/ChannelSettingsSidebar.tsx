import { useState, useEffect } from "react";
import { useChatStore, Channel } from "@/lib/stores/chat-store";
import { api } from "@/lib/api";
import { X, UserPlus, Trash2, Shield, User, Search, Check, Pencil, Archive } from "lucide-react";
import { useUsers } from "@/lib/hooks/use-users";

interface Props {
    channel: Channel;
    onClose: () => void;
}

interface Member {
    user_id: string;
    role: string;
}

export function ChannelSettingsSidebar({ channel, onClose }: Props) {
    const channels = useChatStore((s) => s.channels);
    const removeChannel = useChatStore((s) => s.removeChannel);
    const setActiveChannel = useChatStore((s) => s.setActiveChannel);
    const [members, setMembers] = useState<Member[]>([]);
    const { users } = useUsers();
    const [loading, setLoading] = useState(true);
    const [showAddPicker, setShowAddPicker] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [adding, setAdding] = useState(false);

    // Edit state
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(channel.name);
    const [editDescription, setEditDescription] = useState(channel.description || "");
    const [saving, setSaving] = useState(false);
    const [editError, setEditError] = useState("");

    // Archive confirmation
    const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
    const [archiving, setArchiving] = useState(false);

    const fetchMembers = async () => {
        try {
            const res = await api.request<Member[]>(`/api/channels/${channel.id}/members`);
            setMembers(res);
        } catch (e) {
            console.error("Failed to fetch members", e);
        }
    };

    useEffect(() => {
        setLoading(true);
        fetchMembers().finally(() => setLoading(false));
    }, [channel.id]);

    // Reset edit state when channel changes
    useEffect(() => {
        setEditName(channel.name);
        setEditDescription(channel.description || "");
        setIsEditing(false);
        setShowArchiveConfirm(false);
    }, [channel.id, channel.name, channel.description]);

    const handleSaveEdit = async () => {
        if (!editName.trim()) {
            setEditError("Channel name is required");
            return;
        }
        setSaving(true);
        setEditError("");
        try {
            await api.updateChannel(channel.id, {
                name: editName.trim().toLowerCase().replace(/\s+/g, "-"),
                description: editDescription.trim() || undefined,
            });
            setIsEditing(false);
            // Refresh channel list by closing and re-opening would be simplest,
            // but let's update the store directly
            const updated = await api.getChannel(channel.id);
            useChatStore.getState().updateChannel(updated.id, {
                ...updated,
                type: updated.type as "public" | "private" | "dm" | "agent",
            });
        } catch (err) {
            setEditError(err instanceof Error ? err.message : "Failed to update channel");
        } finally {
            setSaving(false);
        }
    };

    const handleArchive = async () => {
        setArchiving(true);
        try {
            await api.deleteChannel(channel.id);
            removeChannel(channel.id);
            // Switch to first remaining channel
            const remaining = channels.filter((c) => c.id !== channel.id);
            if (remaining.length > 0) {
                setActiveChannel(remaining[0].id);
            }
            onClose();
        } catch (err) {
            console.error("Failed to archive channel:", err);
        } finally {
            setArchiving(false);
        }
    };

    const handleRemoveMember = async (userId: string) => {
        try {
            await api.request(`/api/channels/${channel.id}/members/${userId}`, { method: 'DELETE' });
            setMembers(prev => prev.filter(m => m.user_id !== userId));
        } catch {
            console.error("Failed to remove member — insufficient permissions.");
        }
    };

    const handleAddMembers = async () => {
        if (selectedUserIds.length === 0) return;
        setAdding(true);
        try {
            await api.addChannelMembers(channel.id, selectedUserIds);
            // Re-fetch members to get fresh list
            await fetchMembers();
            setSelectedUserIds([]);
            setSearchQuery("");
            setShowAddPicker(false);
        } catch {
            console.error("Failed to add members — insufficient permissions.");
        } finally {
            setAdding(false);
        }
    };

    const memberUserIds = new Set(members.map(m => m.user_id));
    const nonMembers = users.filter(
        u => !memberUserIds.has(u.id) &&
            ((u.display_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                (u.email || "").toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="w-80 border-l border-border bg-card flex flex-col h-full animate-slide-in-right shrink-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h2 className="font-display font-bold text-sm">Channel Settings</h2>
                <button
                    onClick={onClose}
                    className="p-1 rounded hover:bg-accent transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="p-4 border-b border-border space-y-4">
                {isEditing ? (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-medium mb-1">Name</label>
                            <input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary/30 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1">Description</label>
                            <input
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                placeholder="What's this channel about?"
                                className="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary/30 transition-colors"
                            />
                        </div>
                        {editError && <p className="text-xs text-destructive">{editError}</p>}
                        <div className="flex gap-2">
                            <button
                                onClick={handleSaveEdit}
                                disabled={saving}
                                className="flex-1 py-1.5 rounded-md text-xs bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors font-medium"
                            >
                                {saving ? "Saving..." : "Save"}
                            </button>
                            <button
                                onClick={() => {
                                    setIsEditing(false);
                                    setEditName(channel.name);
                                    setEditDescription(channel.description || "");
                                    setEditError("");
                                }}
                                className="flex-1 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-accent transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <div>
                        <div className="flex items-start justify-between">
                            <h3 className="font-semibold text-lg">{channel.icon ? `${channel.icon} ` : ""}{channel.name}</h3>
                            <button
                                onClick={() => setIsEditing(true)}
                                className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground"
                                title="Edit channel"
                            >
                                <Pencil className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        {channel.description && <p className="text-sm text-muted-foreground mt-1">{channel.description}</p>}
                    </div>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-accent/50 p-2 rounded-md">
                    {channel.is_private ? <Shield className="w-3.5 h-3.5" /> : <Hash className="w-3.5 h-3.5" />}
                    <span>{channel.is_private ? "Private Group" : "Public Channel"}</span>
                </div>

                {/* Archive channel */}
                {!showArchiveConfirm ? (
                    <button
                        onClick={() => setShowArchiveConfirm(true)}
                        className="flex items-center gap-2 w-full py-2 px-3 rounded-md text-xs text-destructive hover:bg-destructive/10 transition-colors"
                    >
                        <Archive className="w-3.5 h-3.5" />
                        Archive Channel
                    </button>
                ) : (
                    <div className="p-3 border border-destructive/30 rounded-md bg-destructive/5 space-y-2">
                        <p className="text-xs text-destructive font-medium">Are you sure? This will archive the channel.</p>
                        <div className="flex gap-2">
                            <button
                                onClick={handleArchive}
                                disabled={archiving}
                                className="flex-1 py-1.5 rounded-md text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 transition-colors font-medium"
                            >
                                {archiving ? "Archiving..." : "Yes, Archive"}
                            </button>
                            <button
                                onClick={() => setShowArchiveConfirm(false)}
                                className="flex-1 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-accent transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold">Members ({members.length})</h4>
                    <button
                        onClick={() => setShowAddPicker(prev => !prev)}
                        className="flex items-center gap-1 text-xs text-primary hover:bg-primary/10 px-2 py-1 rounded-md transition-colors"
                    >
                        <UserPlus className="w-3.5 h-3.5" />
                        Add
                    </button>
                </div>

                {/* Add member picker */}
                {showAddPicker && (
                    <div className="mb-4 border border-border rounded-lg p-3 bg-background space-y-2">
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                            <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by name or email..."
                                className="w-full pl-8 pr-3 py-2 rounded-md border border-border bg-card text-xs focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary/30 transition-colors"
                                autoFocus
                            />
                        </div>

                        <div className="max-h-36 overflow-y-auto space-y-0.5">
                            {nonMembers.map(u => {
                                const isSelected = selectedUserIds.includes(u.id);
                                return (
                                    <button
                                        key={u.id}
                                        onClick={() => {
                                            setSelectedUserIds(prev =>
                                                isSelected
                                                    ? prev.filter(id => id !== u.id)
                                                    : [...prev, u.id]
                                            );
                                        }}
                                        className="w-full text-left px-2 py-1.5 rounded-md hover:bg-accent flex items-center justify-between"
                                    >
                                        <div className="overflow-hidden">
                                            <p className="text-xs font-medium truncate">{u.display_name}</p>
                                            <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                                        </div>
                                        {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                                    </button>
                                );
                            })}
                            {nonMembers.length === 0 && (
                                <p className="text-center text-[10px] p-2 text-muted-foreground">
                                    {searchQuery ? "No matching users" : "Everyone is already a member"}
                                </p>
                            )}
                        </div>

                        {selectedUserIds.length > 0 && (
                            <button
                                onClick={handleAddMembers}
                                disabled={adding}
                                className="w-full py-1.5 rounded-md text-xs bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                            >
                                {adding ? "Adding..." : `Add ${selectedUserIds.length} member${selectedUserIds.length > 1 ? "s" : ""}`}
                            </button>
                        )}
                    </div>
                )}

                {loading ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
                ) : (
                    <div className="space-y-2">
                        {members.map(member => {
                            const user = users.find(u => u.id === member.user_id);
                            return (
                                <div key={member.user_id} className="flex items-center justify-between group p-2 hover:bg-accent rounded-md transition-colors">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                            <User className="w-4 h-4 text-primary" />
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="text-sm font-medium truncate">{user ? user.display_name : member.user_id}</p>
                                            <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleRemoveMember(member.user_id)}
                                        className="opacity-0 group-hover:opacity-100 p-1.5 text-destructive hover:bg-destructive/10 rounded transition-all"
                                        title="Remove member"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}

function Hash(props: any) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="9" y2="9" /><line x1="4" x2="20" y1="15" y2="15" /><line x1="10" x2="8" y1="3" y2="21" /><line x1="16" x2="14" y1="3" y2="21" /></svg>
}
