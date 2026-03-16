import { useState, useEffect } from "react";
import { useChatStore, Channel } from "@/lib/stores/chat-store";
import { api } from "@/lib/api";
import { X, UserPlus, Trash2, Shield, User } from "lucide-react";

interface Props {
    channel: Channel;
    onClose: () => void;
}

interface Member {
    user_id: string;
    role: string;
}

interface UserData {
    id: string;
    display_name: string;
    email: string;
}

export function ChannelSettingsSidebar({ channel, onClose }: Props) {
    const [members, setMembers] = useState<Member[]>([]);
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchMembers = async () => {
        try {
            const res = await api.request<Member[]>(`/api/channels/${channel.id}/members`);
            setMembers(res);
        } catch (e) {
            console.error("Failed to fetch members", e);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await api.getUsers();
            setUsers(res);
        } catch (e) {
            console.error("Failed to fetch users", e);
        }
    };

    useEffect(() => {
        setLoading(true);
        Promise.all([fetchMembers(), fetchUsers()]).finally(() => setLoading(false));
    }, [channel.id]);

    const handleRemoveMember = async (userId: string) => {
        try {
            await api.request(`/api/channels/${channel.id}/members/${userId}`, { method: 'DELETE' });
            setMembers(prev => prev.filter(m => m.user_id !== userId));
        } catch (e) {
            alert("Failed to remove member. You might not have permission.");
        }
    };

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
                <div>
                    <h3 className="font-semibold text-lg">{channel.icon ? `${channel.icon} ` : ""}{channel.name}</h3>
                    {channel.description && <p className="text-sm text-muted-foreground mt-1">{channel.description}</p>}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-accent/50 p-2 rounded-md">
                    {channel.is_private ? <Shield className="w-3.5 h-3.5" /> : <Hash className="w-3.5 h-3.5" />}
                    <span>{channel.is_private ? "Private Group" : "Public Channel"}</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold">Members ({members.length})</h4>
                </div>

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
