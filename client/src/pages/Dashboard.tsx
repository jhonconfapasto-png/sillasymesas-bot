import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { MessageCircle, Activity, AlertCircle, CheckCircle, Search, RefreshCw } from "lucide-react";

interface Conversation {
  id: number;
  senderId: string;
  senderName: string;
  lastMessageAt: Date;
  createdAt: Date;
  messageCount: number;
}

interface BotActivity {
  id: number;
  action: string;
  status: "success" | "error" | "pending";
  senderId: string | null;
  details: string | null;
  timestamp: Date;
}

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch conversations with polling
  const { data: conversations, isLoading: conversationsLoading, refetch: refetchConversations } =
    trpc.facebook.getConversations.useQuery(undefined, {
      enabled: isAuthenticated && user?.role === "admin",
      refetchInterval: 5000, // Poll every 5 seconds
    });

  // Fetch recent activity with polling
  const { data: activities, isLoading: activitiesLoading, refetch: refetchActivities } =
    trpc.facebook.getRecentActivity.useQuery(
      { limit: 50 },
      {
        enabled: isAuthenticated && user?.role === "admin",
        refetchInterval: 5000, // Poll every 5 seconds
      }
    );

  // Fetch dashboard stats with polling
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } =
    trpc.facebook.getDashboardStats.useQuery(undefined, {
      enabled: isAuthenticated && user?.role === "admin",
      refetchInterval: 10000, // Poll every 10 seconds
    });

  // Fetch conversation details
  const { data: conversationDetails } =
    trpc.facebook.getConversationDetails.useQuery(
      { senderId: selectedConversation || "" },
      {
        enabled: !!selectedConversation && isAuthenticated && user?.role === "admin",
      }
    );

  // Manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      refetchConversations(),
      refetchActivities(),
      refetchStats(),
    ]);
    setIsRefreshing(false);
  };

  // Filter conversations based on search
  const filteredConversations = conversations?.filter((conv) =>
    (conv.senderName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.senderId.includes(searchQuery)
  ) || [];

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Acceso Denegado</CardTitle>
            <CardDescription>
              Solo los administradores pueden acceder al dashboard.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/50">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                SillasMesas Bot Dashboard
              </h1>
              <p className="text-muted-foreground mt-2">
                Monitorea conversaciones y actividad del bot en tiempo real
              </p>
            </div>
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Actualizando..." : "Actualizar"}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Conversaciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {statsLoading ? "..." : stats?.totalConversations || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Usuarios únicos
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Mensajes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">
                {statsLoading ? "..." : stats?.totalMessages || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Mensajes procesados
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Respuestas Exitosas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {statsLoading ? "..." : stats?.successfulResponses || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Tasa: {stats?.successRate || "0"}%
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Errores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {statsLoading ? "..." : stats?.failedResponses || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Respuestas fallidas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Conversations List */}
          <div className="lg:col-span-1">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Conversaciones
                </CardTitle>
                <CardDescription>
                  {filteredConversations?.length || 0} de {conversations?.length || 0} conversaciones
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nombre o ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2 flex-1 overflow-y-auto">
                  {conversationsLoading ? (
                    <p className="text-sm text-muted-foreground">Cargando...</p>
                  ) : filteredConversations && filteredConversations.length > 0 ? (
                    filteredConversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => setSelectedConversation(conv.senderId)}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                          selectedConversation === conv.senderId
                            ? "bg-primary text-primary-foreground border-primary shadow-lg"
                            : "hover:bg-accent border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="font-semibold text-sm">
                          {conv.senderName || "Usuario"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {conv.messageCount} mensajes
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(conv.lastMessageAt).toLocaleDateString()}
                        </div>
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {searchQuery ? "No hay resultados" : "No hay conversaciones aún"}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Conversation Details */}
          <div className="lg:col-span-2">
            {selectedConversation ? (
              <Card className="h-full flex flex-col">
                <CardHeader>
                  <CardTitle>Historial de Conversación</CardTitle>
                  <CardDescription>
                    Usuario: {selectedConversation}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto">
                  <div className="space-y-3">
                    {conversationDetails?.messages &&
                    conversationDetails.messages.length > 0 ? (
                      conversationDetails.messages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`p-4 rounded-lg border ${
                            msg.role === "user"
                              ? "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800"
                              : "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800"
                          }`}
                        >
                          <div className={`font-semibold text-sm mb-2 ${
                            msg.role === "user"
                              ? "text-blue-900 dark:text-blue-100"
                              : "text-green-900 dark:text-green-100"
                          }`}>
                            {msg.role === "user" ? "👤 Usuario" : "🤖 Bot"}
                          </div>
                          <div className="text-sm text-foreground whitespace-pre-wrap">
                            {msg.content}
                          </div>
                          <div className="text-xs text-muted-foreground mt-2">
                            {new Date(msg.timestamp).toLocaleString()}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Selecciona una conversación para ver el historial
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Selecciona una conversación para ver detalles
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Activity Log */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Registro de Actividad Reciente
            </CardTitle>
            <CardDescription>
              Últimas {activities?.length || 0} actividades del bot
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {activitiesLoading ? (
                <p className="text-sm text-muted-foreground">Cargando...</p>
              ) : activities && activities.length > 0 ? (
                activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 border-b border-border last:border-0 hover:bg-muted/50 rounded transition-colors"
                  >
                    <div className="mt-1">
                      {activity.status === "success" ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : activity.status === "error" ? (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      ) : (
                        <Activity className="w-5 h-5 text-yellow-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">
                          {activity.action}
                        </span>
                        <Badge
                          variant={
                            activity.status === "success"
                              ? "default"
                              : activity.status === "error"
                                ? "destructive"
                                : "secondary"
                          }
                          className="text-xs"
                        >
                          {activity.status}
                        </Badge>
                      </div>
                      {activity.senderId && (
                        <div className="text-xs text-muted-foreground">
                          Usuario: {activity.senderId}
                        </div>
                      )}
                      {activity.details && (
                        <div className="text-xs text-muted-foreground mt-1 truncate">
                          {activity.details}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(activity.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No hay actividad registrada
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
