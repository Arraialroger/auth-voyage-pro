import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, ArrowRight, Users, Shield, Clock } from 'lucide-react';

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/agenda');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="animate-fade-in">
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                Sistema de
              </span>
              <br />
              <span className="text-foreground">Agenda</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Organize seus compromissos, gerencie seu tempo e nunca mais perca um evento importante.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in">
            <Button 
              size="lg" 
              className="bg-gradient-primary hover:opacity-90 transition-opacity text-lg px-8 py-6 group shadow-glow"
              onClick={() => navigate('/login')}
            >
              Começar Agora
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="border-border/50 bg-background/50 backdrop-blur-sm text-lg px-8 py-6"
              onClick={() => navigate('/login')}
            >
              Fazer Login
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Funcionalidades Principais
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="bg-card/80 backdrop-blur-sm border-border/50 shadow-elegant hover:shadow-glow transition-all duration-300 group">
              <CardHeader>
                <Calendar className="h-12 w-12 text-primary mb-4 group-hover:scale-110 transition-transform" />
                <CardTitle>Agenda Inteligente</CardTitle>
                <CardDescription>
                  Organize seus compromissos de forma visual e intuitiva
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-card/80 backdrop-blur-sm border-border/50 shadow-elegant hover:shadow-glow transition-all duration-300 group">
              <CardHeader>
                <Shield className="h-12 w-12 text-primary mb-4 group-hover:scale-110 transition-transform" />
                <CardTitle>Segurança Total</CardTitle>
                <CardDescription>
                  Seus dados protegidos com autenticação segura
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-card/80 backdrop-blur-sm border-border/50 shadow-elegant hover:shadow-glow transition-all duration-300 group">
              <CardHeader>
                <Clock className="h-12 w-12 text-primary mb-4 group-hover:scale-110 transition-transform" />
                <CardTitle>Lembretes</CardTitle>
                <CardDescription>
                  Nunca mais esqueça de um compromisso importante
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <Card className="max-w-4xl mx-auto bg-gradient-primary text-primary-foreground shadow-glow">
          <CardContent className="p-12 text-center">
            <h3 className="text-3xl font-bold mb-4">
              Pronto para organizar sua vida?
            </h3>
            <p className="text-lg text-primary-foreground/80 mb-8">
              Crie sua conta gratuitamente e comece a usar nossa agenda hoje mesmo.
            </p>
            <Button 
              variant="secondary" 
              size="lg" 
              className="bg-background text-foreground hover:bg-background/90 text-lg px-8 py-6 group"
              onClick={() => navigate('/login')}
            >
              Criar Conta Grátis
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default Index;
