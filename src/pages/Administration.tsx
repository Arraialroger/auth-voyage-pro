import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, UserCheck, Stethoscope, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function Administration() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const adminCards = [
    {
      title: 'Gerenciar Pacientes',
      description: 'Adicionar, editar e excluir pacientes do sistema',
      icon: Users,
      route: '/admin/patients',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Gerenciar Profissionais',
      description: 'Administrar informações dos profissionais',
      icon: UserCheck,
      route: '/admin/professionals',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Gerenciar Tratamentos',
      description: 'Configurar tipos de tratamentos e durações',
      icon: Stethoscope,
      route: '/admin/treatments',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle overflow-x-hidden">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-2 sm:px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Settings className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            <h1 className="text-lg sm:text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Administração
            </h1>
          </div>
          
          <div className="flex items-center space-x-1 sm:space-x-4">
            <Button variant="outline" onClick={() => navigate('/agenda')} className="border-border/50 text-xs sm:text-sm px-2 sm:px-4">
              <span className="sm:hidden">Voltar</span>
              <span className="hidden sm:inline">Voltar à Agenda</span>
            </Button>
            <div className="hidden md:flex items-center space-x-2 text-sm text-muted-foreground">
              <span>{user?.email}</span>
            </div>
            <Button variant="outline" onClick={handleLogout} className="group border-border/50 hover:border-destructive hover:text-destructive text-xs sm:text-sm px-2 sm:px-4">
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-foreground">
              Painel de Administração
            </h2>
            <p className="text-muted-foreground text-lg">
              Gerencie todos os aspectos do sistema de agendamentos
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {adminCards.map((card) => {
              const IconComponent = card.icon;
              return (
                <Card 
                  key={card.title}
                  className="hover:shadow-elegant transition-all duration-200 cursor-pointer group bg-card/80 backdrop-blur-sm border-border/50"
                  onClick={() => navigate(card.route)}
                >
                  <CardHeader className="text-center pb-4">
                    <div className={`w-16 h-16 mx-auto rounded-full ${card.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}>
                      <IconComponent className={`h-8 w-8 ${card.color}`} />
                    </div>
                    <CardTitle className="text-xl font-semibold">
                      {card.title}
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      {card.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button className="w-full group-hover:bg-primary/90 transition-colors">
                      Acessar
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}