import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, LogOut, User, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Agenda() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Calendar className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Minha Agenda
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{user?.email}</span>
            </div>
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="group border-border/50 hover:border-destructive hover:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Welcome Card */}
          <Card className="bg-gradient-primary text-primary-foreground shadow-glow animate-fade-in">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center">
                <Calendar className="mr-3 h-6 w-6" />
                Bem-vindo à sua Agenda!
              </CardTitle>
              <CardDescription className="text-primary-foreground/80">
                Organize seus compromissos e gerencie seu tempo de forma eficiente.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-card/80 backdrop-blur-sm border-border/50 shadow-elegant hover:shadow-glow transition-all duration-300">
              <CardContent className="p-6 text-center">
                <Clock className="h-8 w-8 text-primary mx-auto mb-2" />
                <h3 className="font-semibold text-lg">Hoje</h3>
                <p className="text-2xl font-bold text-primary">0</p>
                <p className="text-sm text-muted-foreground">compromissos</p>
              </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur-sm border-border/50 shadow-elegant hover:shadow-glow transition-all duration-300">
              <CardContent className="p-6 text-center">
                <Calendar className="h-8 w-8 text-primary mx-auto mb-2" />
                <h3 className="font-semibold text-lg">Esta Semana</h3>
                <p className="text-2xl font-bold text-primary">0</p>
                <p className="text-sm text-muted-foreground">eventos</p>
              </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur-sm border-border/50 shadow-elegant hover:shadow-glow transition-all duration-300">
              <CardContent className="p-6 text-center">
                <User className="h-8 w-8 text-primary mx-auto mb-2" />
                <h3 className="font-semibold text-lg">Próximos</h3>
                <p className="text-2xl font-bold text-primary">0</p>
                <p className="text-sm text-muted-foreground">agendamentos</p>
              </CardContent>
            </Card>
          </div>

          {/* Empty State */}
          <Card className="bg-card/80 backdrop-blur-sm border-border/50 shadow-elegant animate-fade-in">
            <CardContent className="p-12 text-center">
              <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Sua agenda está vazia</h3>
              <p className="text-muted-foreground mb-6">
                Comece criando seus primeiros compromissos e eventos.
              </p>
              <Button className="bg-gradient-primary hover:opacity-90 transition-opacity">
                Adicionar Evento
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}