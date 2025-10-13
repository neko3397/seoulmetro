import { Topic } from '../types/video';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';

interface TopicCardProps {
  topic: Topic;
  onSelect: (topicId: string) => void;
}

export const TopicCard = ({ topic, onSelect }: TopicCardProps) => {
  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow duration-200 overflow-hidden"
      onClick={() => onSelect(topic.id)}
    >
      <div className="aspect-video w-full overflow-hidden">
        <img 
          src={topic.thumbnail} 
          alt={topic.title}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
        />
      </div>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="line-clamp-1">{topic.title}</h3>
          <Badge variant="secondary" className="shrink-0">
            {topic.videoCount}개
          </Badge>
        </div>
        <p className="text-muted-foreground line-clamp-2">
          {topic.description}
        </p>
      </CardContent>
    </Card>
  );
};