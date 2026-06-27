import { Inbox } from 'lucide-react';

interface Props {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-crystal-100 flex items-center justify-center mb-4">
        <Inbox className="w-8 h-8 text-crystal-500" />
      </div>
      <h3 className="text-lg font-heading font-semibold text-crystal-900 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-crystal-600 max-w-sm mb-4">{description}</p>
      )}
      {action}
    </div>
  );
}
