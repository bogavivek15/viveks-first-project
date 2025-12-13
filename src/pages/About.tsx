import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, Heart, Target, Users } from 'lucide-react';

const About = () => {
  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            About STUDENT DESK
          </h1>
          <p className="text-xl text-center text-muted-foreground mb-12">
            Empowering B-Tech students to succeed, one note at a time
          </p>

          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="flex gap-4 mb-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-2">Our Mission</h2>
                  <p className="text-muted-foreground">
                    STUDENT DESK was created with a simple yet powerful mission: to ensure that no B-Tech student 
                    struggles alone during exam preparation. We understand the challenges of backlogs and the stress 
                    of supplementary exams. That's why we've built a platform that provides comprehensive, 
                    quality study materials accessible to everyone, anytime, anywhere.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-full bg-secondary/10 flex items-center justify-center mb-4">
                  <Heart className="h-6 w-6 text-secondary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Built with Care</h3>
                <p className="text-muted-foreground">
                  Every note on our platform is carefully curated and organized to help students like you 
                  succeed. We know what it's like to struggle, and we're here to help.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-xl font-bold mb-2">Community Driven</h3>
                <p className="text-muted-foreground">
                  STUDENT DESK is more than just a notes platform—it's a community of students supporting 
                  each other through the challenges of engineering education.
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-2">
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-2">What We Offer</h2>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>✓ Comprehensive notes for all B-Tech branches</li>
                    <li>✓ Year-wise and subject-wise organization</li>
                    <li>✓ Special focus on supplementary exam materials</li>
                    <li>✓ Easy-to-download PDF format</li>
                    <li>✓ Regular updates with new content</li>
                    <li>✓ 24/7 accessibility from any device</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="mt-12 text-center">
            <p className="text-lg text-muted-foreground">
              Remember: Success is not about never failing, but about never giving up. 
              We're here to support you every step of the way.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;