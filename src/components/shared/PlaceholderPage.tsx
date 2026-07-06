import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PlaceholderPageProps {
  title: string;
  description: string;
  implementedIn: string;
}

export function PlaceholderPage({ title, description, implementedIn }: PlaceholderPageProps) {
  return (
    <Card className="mx-auto mt-8 max-w-3xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">
          This screen will be implemented in a later phase of the project.
        </p>
        <Badge variant="outline">Implemented in {implementedIn}</Badge>
      </CardContent>
    </Card>
  );
}
