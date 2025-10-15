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
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="line-clamp-3">{topic.title}</h3>
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