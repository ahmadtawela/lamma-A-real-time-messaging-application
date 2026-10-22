import { useParams } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageProvider';
import ConversationSidebar from '@/features/chat/components/ConversationSidebar';
import ChatView from '@/features/chat/components/ChatView';

/** /app (list) and /app/chat/:conversationId. Mobile: list -> conversation -> details. Desktop: three columns. */
export default function ChatsPage() {
  const { conversationId } = useParams();
  const { t } = useLanguage();
  return (
    <div className="flex h-full min-h-0">
      <ConversationSidebar className={conversationId ? 'hidden md:flex' : 'flex flex-1 md:flex-none'} />
      {conversationId ? <ChatView key={conversationId} conversationId={Number(conversationId)} /> : (
        <div className="hidden flex-1 place-items-center bg-bg md:grid"><div className="text-center text-text-2"><MessageCircle className="mx-auto mb-3 h-12 w-12" /><p>{t('chat.selectChat')}</p></div></div>
      )}
    </div>
  );
}
