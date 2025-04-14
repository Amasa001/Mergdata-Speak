import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Languages, Book, BarChart, Clock } from 'lucide-react';

export const TranslatorDashboard: React.FC = () => {
  // Mock stats for translator dashboard
  const stats = [
    {
      title: "Translations Completed",
      value: "37",
      icon: <Languages className="h-5 w-5 text-afri-purple" />,
      description: "Total phrases translated"
    },
    {
      title: "Languages",
      value: "3",
      icon: <Book className="h-5 w-5 text-afri-green" />,
      description: "Languages you've translated to"
    },
    {
      title: "Translation Accuracy",
      value: "94%",
      icon: <BarChart className="h-5 w-5 text-afri-blue" />,
      description: "Based on validator feedback"
    },
    {
      title: "Average Time",
      value: "2:36",
      icon: <Clock className="h-5 w-5 text-afri-orange" />,
      description: "Minutes per translation"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-medium text-gray-600">{stat.title}</CardTitle>
                {stat.icon}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <CardDescription>{stat.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tasks Section */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle>Available Translation Tasks</CardTitle>
          <CardDescription>Translate content from English to selected African languages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Task card 1 */}
            <Card className="border border-gray-200">
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium">Basic Phrases</h3>
                  <span className="text-xs bg-green-100 text-green-700 py-1 px-2 rounded">Active</span>
                </div>
                <p className="text-sm text-gray-500 mb-3">Translate common everyday phrases from English to your selected languages.</p>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">10 new assignments</span>
                  <Link to="/translate" className="text-sm font-medium text-afri-purple hover:underline">
                    Start Translating →
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Task card 2 */}
            <Card className="border border-gray-200">
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium">Cultural Expressions</h3>
                  <span className="text-xs bg-yellow-100 text-yellow-700 py-1 px-2 rounded">Coming Soon</span>
                </div>
                <p className="text-sm text-gray-500 mb-3">Help translate cultural expressions and idioms to preserve language nuances.</p>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Available next week</span>
                  <span className="text-sm font-medium text-gray-400">
                    Locked →
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your most recent translation submissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((item) => (
              <div key={item} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="font-medium">Phrase #{410-item}</p>
                  <p className="text-sm text-gray-500">English → {['Twi', 'Ewe', 'Yoruba'][item-1]}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm">{['2 hours ago', 'Yesterday', '3 days ago'][item-1]}</p>
                  <p className="text-xs text-green-600">Approved</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 