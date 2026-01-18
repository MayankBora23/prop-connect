import { useState, useEffect } from 'react';
import { useCourses } from '@/hooks/useCourses';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Search, GraduationCap, Clock, Users, IndianRupee, BookOpen, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Course } from '@/hooks/useCourses';

interface CourseSuggestionsProps {
  onSelectCourse?: (course: Course) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CourseSuggestions({ onSelectCourse, isOpen, onOpenChange }: CourseSuggestionsProps) {
  const { data: courses, isLoading } = useCourses();
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourseType, setSelectedCourseType] = useState<string>('all');
  const [selectedInstructor, setSelectedInstructor] = useState<string>('all');
  const [maxPrice, setMaxPrice] = useState<string>('');

  // Get unique instructors and course types for filters
  const instructors = Array.from(new Set(courses?.map(c => c.instructor_id).filter(Boolean) || []));
  const courseTypes = Array.from(new Set(courses?.map(c => c.course_type).filter(Boolean) || []));

  useEffect(() => {
    if (!courses) return;

    let filtered = courses.filter(course => {
      const matchesSearch = searchTerm === '' ||
        course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.subjects_covered?.some(subject =>
          subject.toLowerCase().includes(searchTerm.toLowerCase())
        ) ||
        course.teachers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.status?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = selectedCourseType === 'all' || course.course_type === selectedCourseType;
      const matchesInstructor = selectedInstructor === 'all' || course.instructor_id === selectedInstructor;
      const matchesPrice = maxPrice === '' || (course.price && parseFloat(course.price) <= parseFloat(maxPrice));

      return matchesSearch && matchesType && matchesInstructor && matchesPrice && course.status === 'active';
    });

    setFilteredCourses(filtered);
  }, [courses, searchTerm, selectedCourseType, selectedInstructor, maxPrice]);

  const formatPrice = (price: string | null) => {
    if (!price) return 'Price on request';
    return `₹${price}`;
  };

  const getCourseTypeColor = (type: string) => {
    switch (type) {
      case 'online': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'offline': return 'bg-green-100 text-green-800 border-green-200';
      case 'hybrid': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success/10 text-success border-success/20';
      case 'archived': return 'bg-muted text-muted-foreground border-muted';
      default: return 'bg-muted text-muted-foreground border-muted';
    }
  };

  const handleSendCourse = (course: Course) => {
    onSelectCourse?.(course);
    onOpenChange(false);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCourseType('all');
    setSelectedInstructor('all');
    setMaxPrice('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            Course Suggestions
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Browse and send course details to your WhatsApp contacts
          </p>
        </DialogHeader>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-secondary/30 rounded-lg">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search courses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={selectedCourseType} onValueChange={setSelectedCourseType}>
            <SelectTrigger>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {courseTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedInstructor} onValueChange={setSelectedInstructor}>
            <SelectTrigger>
              <SelectValue placeholder="All Instructors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Instructors</SelectItem>
              {courses?.filter(course => course.teachers?.name).map(course => (
                <SelectItem key={course.instructor_id} value={course.instructor_id!}>
                  {course.teachers!.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            placeholder="Max Price (₹)"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            type="number"
          />
        </div>

        {(searchTerm || selectedCourseType !== 'all' || selectedInstructor !== 'all' || maxPrice) && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {searchTerm && <Badge variant="secondary">Search: {searchTerm}</Badge>}
            {selectedCourseType !== 'all' && <Badge variant="secondary">Type: {selectedCourseType}</Badge>}
            {selectedInstructor !== 'all' && (
              <Badge variant="secondary">
                Instructor: {courses?.find(c => c.instructor_id === selectedInstructor)?.teachers?.name}
              </Badge>
            )}
            {maxPrice && <Badge variant="secondary">Max: ₹{maxPrice}</Badge>}
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear all
            </Button>
          </div>
        )}

        {/* Courses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="border rounded-lg p-4 space-y-3">
                <div className="aspect-video bg-secondary rounded-lg animate-pulse" />
                <div className="space-y-2">
                  <div className="h-4 bg-secondary rounded animate-pulse" />
                  <div className="h-3 bg-secondary rounded w-3/4 animate-pulse" />
                  <div className="h-3 bg-secondary rounded w-1/2 animate-pulse" />
                </div>
              </div>
            ))
          ) : filteredCourses.length > 0 ? (
            filteredCourses.map((course) => (
              <div key={course.id} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                {/* Course Header */}
                <div className="relative h-24 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <div className="text-center">
                    <GraduationCap className="w-8 h-8 mx-auto text-primary mb-1" />
                    <div className={cn(
                      'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border',
                      getCourseTypeColor(course.course_type)
                    )}>
                      {course.course_type.charAt(0).toUpperCase() + course.course_type.slice(1)}
                    </div>
                  </div>

                  <div className={cn(
                    'absolute top-2 left-2 text-xs px-2 py-1 rounded-full font-medium border',
                    getStatusColor(course.status)
                  )}>
                    {course.status.charAt(0).toUpperCase() + course.status.slice(1)}
                  </div>
                </div>

                {/* Course Details */}
                <div className="p-4 space-y-3">
                  <h3 className="font-semibold text-lg line-clamp-1">{course.name}</h3>

                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {course.description || 'No description available'}
                  </p>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{course.duration_months} months</span>
                    </div>

                    {course.max_students && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span>Max {course.max_students} students</span>
                      </div>
                    )}

                    {course.teachers?.name && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <BookOpen className="w-4 h-4" />
                        <span>{course.teachers.name}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-primary font-bold text-lg">
                      <IndianRupee className="w-4 h-4" />
                      <span>{formatPrice(course.price)}</span>
                    </div>

                    {course.subjects_covered && course.subjects_covered.length > 0 && (
                      <div className="flex flex-wrap gap-1 justify-end">
                        {course.subjects_covered.slice(0, 2).map((subject) => (
                          <Badge key={subject} variant="secondary" className="text-xs">
                            {subject}
                          </Badge>
                        ))}
                        {course.subjects_covered.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{course.subjects_covered.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={() => handleSendCourse(course)}
                    className="w-full"
                    size="sm"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send Course Details
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              <GraduationCap className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No courses found matching your criteria</p>
              <p className="text-sm">Try adjusting your filters</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}