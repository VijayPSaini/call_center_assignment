// components/NotificationModal.tsx
import { AgentNotification } from "../types/types";

interface Props {
  notification: AgentNotification;
  onRespond: (accepted: boolean) => void;
}

export default function NotificationModal({ notification, onRespond }: Props) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
      <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md text-center animate-fadeIn">
        <h2 className="text-xl font-bold mb-4">📞 Incoming Call</h2>
        <p className="mb-6 text-gray-700">
          Customer <b>{notification.customerId}</b> wants to connect with you.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => onRespond(true)}
            className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
          >
            Accept
          </button>
          <button
            onClick={() => onRespond(false)}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}
